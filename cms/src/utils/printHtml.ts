import printJS from "print-js"

export function printHtmlInPlace(html: string, documentTitle = "Mẫu in") {
  printJS({
    printable: `<div class="print-sheet">${html}</div>`,
    type: "raw-html",
    documentTitle,
    style: "html,body{margin:0;padding:0;background:#fff}.print-sheet{box-sizing:border-box} img{max-width:100%;height:auto}",
  })
}
