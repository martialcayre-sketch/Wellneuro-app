import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {}
}

declare module 'next-auth/jwt' {
  interface JWT {}
}
