"use strict";

var obsidian = require("obsidian");

class AutoCollapsePlugin extends obsidian.Plugin {
    async onload() {
        console.log("Auto Collapse Folders 插件已加载");

        this.isCollapsing = false;
        this.pendingFile = null;
        this.lastActivePath = null;

        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                this.requestCollapse(file);
            })
        );
    }

    requestCollapse(file) {
        if (!file || file.path === this.lastActivePath) return;

        this.pendingFile = file;
        if (!this.isCollapsing) {
            void this.processPendingCollapses();
        }
    }

    processPendingCollapses() {
        this.isCollapsing = true;

        try {
            while (this.pendingFile) {
                const activeFile = this.pendingFile;
                this.pendingFile = null;

                if (activeFile.path === this.lastActivePath) continue;

                // Mark this first: setCollapsed can synchronously emit file-open again.
                this.lastActivePath = activeFile.path;
                this.collapseOtherFolders(activeFile);
            }
        } finally {
            this.isCollapsing = false;
        }
    }

    collapseOtherFolders(activeFile) {
        if (!activeFile) return;

        // 获取文件列表视图
        const explorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];
        if (!explorerLeaf) return;

        const view = explorerLeaf.view;
        const fileItems = view.fileItems;
        if (!fileItems) return;

        // 获取当前文件所有的父级文件夹路径
        const parentPaths = new Set();
        let currentParent = activeFile.parent;
        while (currentParent) {
            parentPaths.add(currentParent.path);
            currentParent = currentParent.parent;
        }

        // 遍历所有文件夹项
        for (const path in fileItems) {
            const item = fileItems[path];

            // 检查是否为文件夹项且不是根目录
            if (item.setCollapsed && path !== "/") {
                // Obsidian reveals the active file itself. Do not fight that behavior
                // by expanding ancestors; only collapse folders outside that path.
                if (!parentPaths.has(path) && !item.collapsed) {
                    item.setCollapsed(true);
                }
            }
        }
    }

    onunload() {
        console.log("Auto Collapse Folders 插件已卸载");
    }
}

module.exports = AutoCollapsePlugin;