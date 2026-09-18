import { Redirect } from 'expo-router';

// Any path the router cannot match (a malformed launch URL, a stale deep link) lands on the Garage tab instead of
// expo-router's black "Unmatched Route" page. The demo has no user-facing 404.
export default function NotFound() {
  return <Redirect href="/(tabs)/garage" />;
}
