/// <reference types="vite/client" />

import 'react-router';

declare module 'react-router' {
  interface Future {
    v8_middleware: true;
  }
}

declare module 'virtual:react-router/server-build' {
  const build: import('react-router').ServerBuild;
  export = build;
}
