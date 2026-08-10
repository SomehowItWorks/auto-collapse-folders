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

    async processPendingCollapses() {
        this.isCollapsing = true;

        try {
            while (this.pendingFile) {
                const activeFile = this.pendingFile;
                this.pendingFile = null;

                if (activeFile.path === this.lastActivePath) continue;

                // Mark this first: setCollapsed can synchronously emit file-open again.
                this.lastActivePath = activeFile.path;
                await this.collapseOtherFolders(activeFile);
            }
        } finally {
            this.isCollapsing = false;
        }
    }

    async collapseOtherFolders(activeFile) {
        if (!activeFile) return;

        // 获取文件列表视图
        const explorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];
        if (!explorerLeaf) return;

        const view = explorerLeaf.view;
        const fileItems = view.fileItems;
        if (!fileItems) return;

        // 获取当前文件所有的父级文件夹路径
        const parentPaths = [];
        let currentParent = activeFile.parent;
        while (currentParent) {
            parentPaths.push(currentParent.path);
            currentParent = currentParent.parent;
        }

        // 遍历所有文件夹项
        for (const path in fileItems) {
            const item = fileItems[path];

            // 检查是否为文件夹项且不是根目录
            if (item.setCollapsed && path !== "/") {
                // 如果当前路径不在活跃文件的父路径列表中，则折叠
                // 否则保持展开（让用户能看到当前文件在哪个位置）
                const shouldBeOpen = parentPaths.includes(path);

                // 仅在状态不一致时调用，减少 UI 刷新压力
                if (item.collapsed !== !shouldBeOpen) {
                    await item.setCollapsed(!shouldBeOpen);
                }
            }
        }
    }

    onunload() {
        console.log("Auto Collapse Folders 插件已卸载");
    }
}

module.exports = AutoCollapsePlugin;