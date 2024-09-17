declare global {
  export namespace Express {
    export interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export {};
