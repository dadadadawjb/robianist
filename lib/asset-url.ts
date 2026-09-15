export function assetUrl(url:string) {
  return url.startsWith('/models/')?`${process.env.NEXT_PUBLIC_BASE_PATH??''}${url}`:url;
}
