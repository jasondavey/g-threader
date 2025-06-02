// This file adds custom type definitions to augment Express types

import * as express from 'express';

declare global {
  namespace Express {
    export interface Request {
      // Add any custom properties you need on the request object
    }
    export interface Response {
      // Add any custom properties you need on the response object
    }
  }
}

// This empty export is needed to make this file a module
export {};
