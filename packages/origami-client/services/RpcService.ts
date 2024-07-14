/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RpcService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * @param programId
   * @returns any Successful response
   * @throws ApiError
   */
  public programGet(programId: string): CancelablePromise<{
    programId: string;
    version: 'v1';
    subscribe: Array<
      {
        usi: string;
      } & Record<string, any>
    >;
    code: string;
    status: 'published' | 'started' | 'stopped' | 'destroying';
    createdAt: string;
  }> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/getProgram',
      query: {
        programId: programId,
      },
    });
  }
  /**
   * @param requestBody
   * @returns any Successful response
   * @throws ApiError
   */
  public programCreate(requestBody: {
    version: 'v1';
    subscribe: Array<
      | {
          usi: string;
          from?: number;
          to?: number;
        }
      | {
          usi: string;
          from?: number;
          to?: number;
          abi: 'erc20';
          event?: string;
          address?: string;
          args?: Record<string, any>;
        }
    >;
    code: string;
  }): CancelablePromise<{
    programId: string;
    status: 'published';
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/createProgram',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @param requestBody
   * @returns any Successful response
   * @throws ApiError
   */
  public programStart(requestBody: { programId: string }): CancelablePromise<{
    programId: string;
    status: 'started';
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/startProgram',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @param requestBody
   * @returns any Successful response
   * @throws ApiError
   */
  public programStop(requestBody: { programId: string }): CancelablePromise<{
    programId: string;
    status: 'stopped';
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/stopProgram',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @param requestBody
   * @returns any Successful response
   * @throws ApiError
   */
  public streamQuery(requestBody: {
    programId: string;
    group?: string;
    limit?: number;
    reverse?: boolean;
    after?: string;
    before?: string;
  }): CancelablePromise<{
    data: Array<{
      data: Record<string, any>;
      sort: string;
      hash: string;
      n: number;
    }>;
    cursors: {
      before?: string;
      after?: string;
    };
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/queryStream',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
