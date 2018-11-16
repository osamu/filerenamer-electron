// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const fs = require("fs")
const path = require('path');
const csvParse = require("csv-parse")
const iconv = require("iconv-lite")

$(() => {
    var columns = [];
    var table = [];
    var workdir = "";
    var rename_candidate_files = [];

    // CSVファイルの読み込み、workdir, column,tableの分離
    function loadCsvfile(filepath) {
        var parser = csvParse({ ltrim: true, delimiter: ',' }, function (err, data) {
            columns = data[0];
            workdir = path.dirname(filepath);
            table = data;
            updateColumnSection();
            renderRenameTable(renamefileMap(0, 1));
            $("#workdir").html(workdir);
        })
        fs.createReadStream(filepath)
            .pipe(iconv.decodeStream('SJIS'))
            .pipe(iconv.encodeStream('UTF-8'))
            .pipe(parser);
    }
    function renamefileMap(srcIndex, dstIndex) {
        return table.map(function (row) {
            return { src: row[srcIndex], dst: row[dstIndex] }
        });
    }

    // CSVファイル、選択先カラムの更新
    function updateColumnSection() {
        $("#column-select option").remove();
        $.each(columns, (index, val) => {
            if (index == 0) return;
            $("#column-select").prepend("<option value=" + index + ">" + val + "</option>")
        });
    }

    function renderInit() {
        columns = [];
        table = [];
        workdir = "";
        rename_candidate_files = [];
        updateColumnSection();
        renderRenameTable([]);
        $("#workdir").html("作業対象フォルダ");
        $("#filename").html("CSVファイルを選択");
        $("#column-select").prepend("<option>リネーム先カラム選択</option>")
    }

    // csvのファイル名一覧を確認しながら、HTMLのテーブルをレンダリング
    function renderRenameTable(rename_map) {
        $("#rename-rows tr").remove();
        $.each(rename_map, (index, rename) => {
            if (index != 0) {
                src_file = path.join(workdir, rename.src)
                elm_src = $("<td>").html(rename.src)
                dest_file = path.join(workdir, rename.dst)
                elm_dst = $("<td>").html(rename.dst)

                if (!fs.existsSync(src_file)) {
                    elm_status = $("<td>").html("元ファイルが存在しないので、スキップします")
                } else if (rename.dst == "") {
                    elm_status = $("<td>").html("変更先ファイル名がないのでスキップします")
                } else if (fs.existsSync(dest_file)) {
                    elm_status = $("<td>").html("変更先ファイル名が存在するので、スキップします")
                } else {
                    elm_status = $("<td>").html("")
                    rename_candidate_files.push([src_file, dest_file, elm_status])
                }

                var row = $("<tr>")
                row.append($("<th>").html(index))
                row.append(elm_src)
                row.append(elm_dst)
                row.append(elm_status)
                $("#rename-rows").append(row);
            }
        });
    }

    function executeRename(rename_map) {
        $.each(rename_map, (index, row) => {
            try {
                fs.renameSync(row[0], row[1])
                row[2].html("DONE")
            } catch (e) {
                row[2].html(e)
            }
        });
    }

    // CSV Fileの選択
    $("#selectFile").on("change", function () {
        var filepath = $('#selectFile')[0].files[0].path;
        var name = $('#selectFile')[0].files[0].name;
        $("#filename").html(name);
        loadCsvfile(filepath);
    })

    // 作業対象ディレクトリの指定
    $("#selectFolder").on("change", function () {
        var folderpath = $('#selectFolder')[0].files[0].path;
        $("#workdir").html(folderpath);
        workdir = folderpath;
        renderRenameTable(renamefileMap(0, columnIdx));
    })

    // リネーム対象カラムの選択
    $("#column-select").on("change", (event) => {
        var columnIdx = $("#column-select").val();
        renderRenameTable(renamefileMap(0, columnIdx));
    });

    // リネーム実行
    $("#execute").click((event) => {
        executeRename(rename_candidate_files)
    })

    // フォームのリセット
    $("#reset").click((event) => {
        renderInit();
    })

    renderInit();
})
