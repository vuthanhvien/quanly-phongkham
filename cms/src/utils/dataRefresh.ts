export const CMS_DATA_REFRESH_EVENT = "cms:data-refresh"

export interface CmsDataRefreshDetail {
  resource?: string
}

/** Ask the active screen to re-fetch its data without reloading the browser. */
export function requestCmsDataRefresh(resource?: string) {
  window.dispatchEvent(new CustomEvent<CmsDataRefreshDetail>(CMS_DATA_REFRESH_EVENT, { detail: { resource } }))
}

