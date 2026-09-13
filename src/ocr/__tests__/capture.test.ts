import { captureVin, type CameraLike } from '../capture';
import { cropRectFor, guideRect } from '../crop';

// expo-image-manipulator is the mock from jest.setup.ts: `ImageManipulator.manipulate` returns a chainable
// { crop, resize, renderAsync } recording each call into `__manipulatorMock.calls`, and `renderAsync()`
// resolves an object whose `saveAsync` resolves the fixed `saved` result (base64 'QUJD', 1400x266).
type ManipCtx = {
  crop: (r: unknown) => ManipCtx;
  resize: (r: unknown) => ManipCtx;
  renderAsync: () => Promise<{ saveAsync: (o: unknown) => Promise<{ uri: string; width: number; height: number; base64?: string }> }>;
};
type ManipulatorMock = {
  ImageManipulator: { manipulate: jest.Mock<ManipCtx, [string]> };
  __manipulatorMock: {
    calls: Array<{ crop?: unknown; resize?: unknown; save?: unknown }>;
    saved: { uri: string; width: number; height: number; base64: string };
  };
};
const manip = jest.requireMock('expo-image-manipulator') as ManipulatorMock;

const preview = { w: 412, h: 915 };
const guide = guideRect(preview);

function fakeCamera(overrides?: Partial<Awaited<ReturnType<CameraLike['takePictureAsync']>>>): {
  camera: CameraLike;
  takePictureAsync: jest.Mock;
} {
  const takePictureAsync = jest.fn(async () => ({ uri: 'file:///photo.jpg', width: 4000, height: 3000, exif: null, ...overrides }));
  return { camera: { takePictureAsync }, takePictureAsync };
}

beforeEach(() => {
  manip.__manipulatorMock.calls.length = 0;
  jest.clearAllMocks();
});

describe('captureVin', () => {
  it('takes the picture with the exact options spec §8 requires', async () => {
    const { camera, takePictureAsync } = fakeCamera();
    await captureVin(camera, guide, preview);
    expect(takePictureAsync).toHaveBeenCalledWith({ quality: 0.85, skipProcessing: false, base64: false, exif: true });
  });

  it('crops to cropRectFor(...) translated to { originX, originY, width, height }', async () => {
    const { camera } = fakeCamera();
    await captureVin(camera, guide, preview);
    const expectedCrop = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 1 });
    expect(manip.__manipulatorMock.calls[0].crop).toEqual({
      originX: expectedCrop.x,
      originY: expectedCrop.y,
      width: expectedCrop.w,
      height: expectedCrop.h,
    });
  });

  it('maps EXIF orientation through to the crop rect', async () => {
    const { camera } = fakeCamera({ exif: { Orientation: 6 } });
    await captureVin(camera, guide, preview);
    const expectedCrop = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 6 });
    expect(manip.__manipulatorMock.calls[0].crop).toEqual({
      originX: expectedCrop.x,
      originY: expectedCrop.y,
      width: expectedCrop.w,
      height: expectedCrop.h,
    });
  });

  it('resizes to width 1400 (height auto)', async () => {
    const { camera } = fakeCamera();
    await captureVin(camera, guide, preview);
    expect(manip.__manipulatorMock.calls[0].resize).toEqual({ width: 1400 });
  });

  it('saves as JPEG, 0.9 compression, with base64', async () => {
    const { camera } = fakeCamera();
    await captureVin(camera, guide, preview);
    expect(manip.__manipulatorMock.calls[0].save).toEqual({ format: 'jpeg', compress: 0.9, base64: true });
  });

  it('resolves the saved base64/dimensions plus the crop rect it computed', async () => {
    const { camera } = fakeCamera();
    const result = await captureVin(camera, guide, preview);
    const expectedCrop = cropRectFor(guide, preview, { w: 4000, h: 3000 }, { orientation: 1 });
    expect(result).toEqual({ base64: 'QUJD', width: 1400, height: 266, crop: expectedCrop });
  });

  it('rejects with no-base64 when the manipulator result lacks base64', async () => {
    manip.ImageManipulator.manipulate.mockImplementationOnce((): ManipCtx => {
      const ctx: ManipCtx = {
        crop: () => ctx,
        resize: () => ctx,
        renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///crop.jpg', width: 1400, height: 266 }) }),
      };
      return ctx;
    });
    const { camera } = fakeCamera();
    await expect(captureVin(camera, guide, preview)).rejects.toThrow('no-base64');
  });
});
