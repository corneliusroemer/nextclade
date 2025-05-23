import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { isNil, isString } from 'lodash'
import { mediaTypes as parseAcceptHeader } from '@hapi/accept'
import { ContentType, type as parseContentTypeHeader } from '@hapi/content'
import { ErrorFatal } from 'src/helpers/ErrorFatal'
import { sanitizeError } from 'src/helpers/sanitizeError'

export interface RequestConfig extends AxiosRequestConfig {
  // Check that MIME type of response's Content-Type header is compatible with at least one of MIME types in the request's Accept header
  strictAccept?: boolean
}

export class HttpRequestError extends Error {
  public readonly url?: string
  public readonly status?: number | string
  public readonly statusText?: string

  constructor(error_: AxiosError) {
    super(error_.message)
    this.url = error_.config.url
    this.status = error_.response?.status ?? error_.status ?? error_.code
    this.statusText = error_.response?.statusText
  }
}

export function isValidHttpUrl(s: string) {
  let url
  try {
    url = new URL(s)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export function validateUrl(url?: string): string {
  if (isNil(url)) {
    throw new ErrorFatal(`Attempted to fetch from an empty URL`)
  }
  if (!isValidHttpUrl(url)) {
    throw new ErrorFatal(`Attempted to fetch from an invalid URL: '${url}'`)
  }
  return url
}

export interface CheckMimeTypesResult {
  isCompatible: boolean
  acceptTypes?: string[]
  contentType?: ContentType
  acceptHeader?: string | number | boolean
  contentTypeHeader?: string
}

export function checkMimeTypes(req?: RequestConfig, res?: AxiosResponse): CheckMimeTypesResult {
  const acceptHeader = req?.headers?.Accept
  const contentTypeHeader = res?.headers['content-type']
  if (isString(acceptHeader) && isString(contentTypeHeader)) {
    const acceptTypes = parseAcceptHeader(acceptHeader)
    const contentType = parseContentTypeHeader(contentTypeHeader)
    const isCompatible = acceptTypes.includes(contentType.mime)
    return { isCompatible, acceptTypes, contentType, acceptHeader, contentTypeHeader }
  }
  return { isCompatible: false, acceptHeader, contentTypeHeader }
}

export async function axiosFetch<TData = unknown>(url_: string | undefined, options?: RequestConfig): Promise<TData> {
  const url = validateUrl(url_)

  let res
  try {
    res = await axios.get(url, options)
  } catch (error) {
    throw axios.isAxiosError(error) ? new HttpRequestError(error) : sanitizeError(error)
  }

  if (!res?.data) {
    throw new Error(`Unable to fetch: request to URL "${url}" resulted in no data`)
  }

  if (options?.strictAccept) {
    const mime = checkMimeTypes(options, res)
    if (!mime.isCompatible) {
      const accept = mime.acceptHeader ?? ''
      const contentType = mime.contentTypeHeader ?? ''
      throw new Error(
        `Unable to fetch: request to URL "${url}" resulted in incompatible MIME type: Content-Type was "${contentType}", while Accept was "${accept}"`,
      )
    }
  }

  return res.data as TData
}

export async function axiosFetchMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetch(url)
}

export async function axiosFetchOrUndefined<TData = unknown>(
  url: string | undefined,
  options?: RequestConfig,
): Promise<TData | undefined> {
  try {
    return await axiosFetch<TData>(url, options)
  } catch {
    return undefined
  }
}

/**
 * This version skips any transforms (such as JSON parsing) and returns plain string
 */
export async function axiosFetchRaw(url: string | undefined, options?: RequestConfig): Promise<string> {
  return axiosFetch(url, {
    ...options,
    transformResponse: [],
    headers: {
      Accept: 'text/plain, */*',
    },
  })
}

export async function axiosFetchRawMaybe(url?: string): Promise<string | undefined> {
  if (!url) {
    return undefined
  }
  return axiosFetchRaw(url)
}

export async function axiosHead(url: string | undefined, options?: RequestConfig): Promise<AxiosResponse> {
  if (isNil(url)) {
    throw new ErrorFatal(`Attempted to fetch from an invalid URL: '${url}'`)
  }

  try {
    return await axios.head(url, options)
  } catch (error) {
    throw axios.isAxiosError(error) ? new HttpRequestError(error) : sanitizeError(error)
  }
}

export async function axiosHeadOrUndefined(
  url: string | undefined,
  options?: RequestConfig,
): Promise<AxiosResponse | undefined> {
  try {
    return await axiosHead(url, options)
  } catch {
    return undefined
  }
}
