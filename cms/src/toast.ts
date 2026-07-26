import { message } from "antd"

type ToastApi = Pick<typeof message, "success" | "error" | "info" | "warning">

let activeToast: ToastApi | null = null

export function registerToastApi(api: ToastApi | null) {
  activeToast = api
  console.info("[toast] provider", { ready: Boolean(api) })
}

export function toastSuccess(content: string) {
  console.info("[toast] success", { content, providerReady: Boolean(activeToast) })
  ;(activeToast || message).success({ content, key: "clinic-toast-success", duration: 3 })
}

export function toastError(content: string) {
  console.info("[toast] error", { content, providerReady: Boolean(activeToast) })
  ;(activeToast || message).error({ content, key: "clinic-toast-error", duration: 5 })
}

export function toastInfo(content: string) {
  console.info("[toast] info", { content, providerReady: Boolean(activeToast) })
  ;(activeToast || message).info({ content, key: "clinic-toast-info", duration: 3 })
}
