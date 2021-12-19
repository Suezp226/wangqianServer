/**
 * @Description: 自定义excel表格样式
 * @author https://www.guofengs.com
 * @date 2019-12-93 21:28
 */
 const Excel = require("exceljs");
 const jsonData = require("./report")
 
 const COLOR = {
     BLUE: "9BC2E6",
     GREEN: "A9D08E",
     REPORT: "9BC2E6"
 }
 
 
 function GetFileStyle(sheet) {
     // 合并单元格
     this.setMerge = function (rows, columns) {
         let char = String.fromCharCode(64 + columns)
         for (let i = 1; i <= rows; i++) {
             sheet.mergeCells(`A${i}:${char}${i}`);
         }
         return this;
     }
 
     // 设置通用值 type = 1 desc, type = 2 header, 3 type
     this.setGeneralValue = function (type, numberLine, params) {
         switch (type) {
             case 1:
                 this.setDesc(numberLine, params);
                 break;
             case 2:
                 this.setHeader(numberLine, params);
                 break;
             case 3:
                 this.setContent(numberLine, params)
             default:
                 break;
         }
         return this;
     }
 
     // 垂直插值
     this.setDesc = function (numberLines, value) {
         let item = null;
         for (let i = 0, length = value.length; i < length; i++) {
             item = value[i];
             sheet.getCell(`A${i + 1}`).value = item;
         }
         return this
     }
 
     // 设置header
     this.setHeader = function (numberLines, value) {
         let keys = []
         for (let i = 0, length = value.length; i < length; i++) {
             let currentLines = numberLines ? numberLines : sheet.rowCount + 1;
             let columnsChar = String.fromCharCode(64 + i + 1);
             let cellNumbers = `${columnsChar}${currentLines}`;
             let item = value[i];
             for (let its in item) {
                 keys.push({
                     key: its,
                     width: 18
                 })
                 sheet.getCell(cellNumbers).value = item[its];
             }
         }
         sheet.columns = keys
         return this
     }
 
     // 设置内容
     this.setContent = function (numberLines, value) {
         sheet.addRows(value)
         return this;
     }
 
     // 设置字体是否居中
     this.setAlignment = function (cell, verticalValue, horizontalValue) {
         sheet.getCell(cell).alignment = {vertical: verticalValue, horizontal: horizontalValue}
         return this;
     }
 
     // 设置字体大小
     this.setFontSize = function (cell) {
         sheet.getCell(cell).font = {
             color: { argb: "FF0000" },
             family: 2,
             size: 14,
             bold: true
         };
         return this;
     }
 
     // 设置背景色
     this.setBackgroundColor = function (cell, color) {
         console.log("color", color)
         sheet.getCell(cell).fill = {
             type: 'pattern',
             pattern: 'solid',
             fgColor: {
                 argb: `FF${color}`
             }
         };
         return this;
     }
 
     // 设置表格边框
     this.setBorderStyle = function (top, right, bottom, left, color, columns, rows) {
         for (let i = 1; i <= columns; i++) {
 
             let char = String.fromCharCode(64 + i)
             console.log(`fdsjklfjdskfjdk${char}${rows}`)
             sheet.getCell(`${char}${rows}`).border = {
                 top: {
                     style: top,
                     color: {
                         argb: `FF${color}`
                     }
                 },
                 left: {
                     style: top,
                     color: {
                         argb: `FF${color}`
                     }
                 },
                 bottom: {
                     style: top,
                     color: {
                         argb: `FF${color}`
                     }
                 },
                 right: {
                     style: top,
                     color: {
                         argb: `FF${color}`
                     }
                 }
             };
         }
         return this;
     }
     this.setBorderRightStyle = function () {
         for (let i = 1; i <= 5; i++) {
             sheet.getCell(`A${i}`).border = {
                 right: {
                     style: "thin",
                     color: {
                         argb: `FF000000`
                     }
                 }
             };
         }
         return this;
     }
 
     return this
 }
 
 
 function createReportFile(filename,sheetName,sheetDescript,header,contentLists) {
    //  let {
    //      filename,
    //      sheetName,
    //      sheetDescript,
    //      header,
    //      contentLists
    //  } = jsonData;
 
     let length = header.length || 4
     let workbook = new Excel.Workbook();
     let sheet = workbook.addWorksheet(sheetName);
 
     let getFileObj = new GetFileStyle(sheet)
     getFileObj
         .setGeneralValue(1, null, sheetDescript)
         .setGeneralValue(2, 1, header)
         .setGeneralValue(3, null, contentLists)
        //  .setFontSize("A1")
        //  .setBorderStyle("thin", "thin", "thin", "thin", "000000", length,6)
        //  .setBorderRightStyle()
        //  .setMerge(5, length)
        //  .setBackgroundColor("A1", COLOR.GREEN)
        //  .setAlignment("A1", "middle", "center");
 
     workbook.xlsx.writeFile(`static/excel/${filename}.xlsx`);
     return filename;
 }
 
module.exports = {
    createReportFile
}
 
 