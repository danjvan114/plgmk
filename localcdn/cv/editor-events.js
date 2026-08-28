class CanvasEditorEvents {
    constructor(core, render) {
        this.core = core;
        this.render = render;
        
        this.tools = {
            select: document.querySelector('.c1aa'),
            move: document.querySelector('.c2aa'),
            pen: document.querySelector('.pen'),
            eraser: document.querySelector('.eraser')
        };
        
        this.colors = document.querySelectorAll('.color-item');
        this.shapes = document.querySelectorAll('.card-item');
        this.textBtn = document.querySelector('.btnsl .mdui-btn:nth-child(2)');
        this.uploadBtn = document.querySelector('.btnsl .mdui-btn:nth-child(3)');
        
        this.layerBtns = {
            up: document.querySelector('.ci01'),
            down: document.querySelector('.ci02'),
            top: document.querySelector('.ci03'),
            bottom: document.querySelector('.ci04'),
            flipH: document.querySelector('.ci05'),
            flipV: document.querySelector('.ci06')
        };
        
        this.undoBtn = document.querySelector('.canvas-container .mdui-btn:nth-child(1)');
        this.redoBtn = document.querySelector('.canvas-container .mdui-btn:nth-child(2)');
        this.addFrameBtn = document.querySelector('.canvas-container .mdui-btn:nth-child(3)');
        this.exportBtn = this.findExportBtn();
        
        this.setupAllEvents();
    }
    
    findExportBtn() {
        const header = document.querySelector('.editor-header');
        if (!header) return null;
        
        const links = header.querySelectorAll('a, div');
        for (const el of links) {
            if (el.textContent && el.textContent.includes('导出')) {
                return el;
            }
            const icon = el.querySelector('[material-icons="cloud_download"]');
            if (icon) {
                return el;
            }
        }
        return null;
    }
    
    setupAllEvents() {
        this.setupToolEvents();
        this.setupColorEvents();
        this.setupCustomColorPicker();
        this.setupShapeEvents();
        this.setupTextEvent();
        this.setupUploadEvent();
        this.setupLayerEvents();
        this.setupCanvasEvents();
        this.setupHistoryEvents();
        this.setupKeyboardEvents();
        this.setupFrameEvents();
        this.setupExportEvent();
        this.setupContextMenuBlock();
        this.setupZoomControl();
    }
    
    setupToolEvents() {
        this.tools.select.addEventListener('click', () => {
            this.core.currentTool = 'select';
            this.highlightTool('select');
        });
        
        this.tools.move.addEventListener('click', () => {
            this.core.currentTool = 'move';
            this.highlightTool('move');
        });
        
        this.tools.pen.addEventListener('click', () => {
            this.core.currentTool = 'pen';
            this.highlightTool('pen');
        });
        
        this.tools.eraser.addEventListener('click', () => {
            this.core.currentTool = 'eraser';
            this.highlightTool('eraser');
        });
    }
    
    highlightTool(tool) {
        Object.keys(this.tools).forEach(key => {
            this.tools[key].style.backgroundColor = key === tool ? '#e0e0e0' : '';
        });
    }
    
    setupColorEvents() {
        this.colors.forEach(color => {
            color.addEventListener('click', () => {
                this.core.currentColor = color.style.backgroundColor;
                color.style.border = '2px solid #000';
                this.colors.forEach(c => {
                    if (c !== color) c.style.border = 'none';
                });
                
                this.core.selectedElements.forEach(el => {
                    if (el.type === 'text' || el.type === 'shape') {
                        el.color = this.core.currentColor;
                    }
                });
                
                if (this.core.selectedElements.length > 0) {
                    this.core.saveState();
                    this.render.render();
                }
            });
        });
    }
    
    setupCustomColorPicker() {
        const activeColorBtn = document.getElementById('active-color');
        const colorPickerBtn = document.querySelector('.color-grid + .mdui-btn');
        
        if (!activeColorBtn || !colorPickerBtn) return;
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.display = 'none';
        
        activeColorBtn.addEventListener('click', () => {
            this.core.currentColor = activeColorBtn.style.backgroundColor;
            
            this.core.selectedElements.forEach(el => {
                if (el.type === 'text' || el.type === 'shape') {
                    el.color = this.core.currentColor;
                }
            });
            
            if (this.core.selectedElements.length > 0) {
                this.core.saveState();
                this.render.render();
            }
        });
        
        colorPickerBtn.addEventListener('click', () => {
            colorInput.click();
        });
        
        colorInput.addEventListener('input', (e) => {
            this.core.currentColor = e.target.value;
            activeColorBtn.style.backgroundColor = e.target.value;
            
            this.core.selectedElements.forEach(el => {
                if (el.type === 'text' || el.type === 'shape') {
                    el.color = this.core.currentColor;
                }
            });
            
            if (this.core.selectedElements.length > 0) {
                this.core.saveState();
                this.render.render();
            }
        });
        
        document.body.appendChild(colorInput);
    }
    
    setupShapeEvents() {
        this.shapes.forEach((shape) => {
            shape.addEventListener('click', () => {
                const img = shape.querySelector('img');
                if (img.src) {
                    this.core.addShape(img.src);
                }
            });
        });
    }
    
    setupTextEvent() {
        this.textBtn.addEventListener('click', () => {
            const text = prompt('请输入文字:', '新文字');
            if (text) {
                this.core.addText(text);
            }
        });
    }
    
    setupUploadEvent() {
        this.uploadBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.core.addImage(file);
                }
            };
            input.click();
        });
    }
    
    setupLayerEvents() {
        if (this.layerBtns.up) {
            this.layerBtns.up.addEventListener('click', () => {
                if (this.core.selectedElement) {
                    this.core.moveLayer(this.core.selectedElement, 1);
                }
            });
        }
        
        if (this.layerBtns.down) {
            this.layerBtns.down.addEventListener('click', () => {
                if (this.core.selectedElement) {
                    this.core.moveLayer(this.core.selectedElement, -1);
                }
            });
        }
        
        if (this.layerBtns.top) {
            this.layerBtns.top.addEventListener('click', () => {
                if (this.core.selectedElement) {
                    this.core.selectedElement.zIndex = this.core.elements.length - 1;
                    this.core.saveState();
                    this.render.render();
                }
            });
        }
        
        if (this.layerBtns.bottom) {
            this.layerBtns.bottom.addEventListener('click', () => {
                if (this.core.selectedElement) {
                    this.core.selectedElement.zIndex = 0;
                    this.core.saveState();
                    this.render.render();
                }
            });
        }
        
        if (this.layerBtns.flipH) {
            this.layerBtns.flipH.addEventListener('click', () => {
                if (this.core.selectedElement && (this.core.selectedElement.type === 'shape' || this.core.selectedElement.type === 'image')) {
                    this.core.selectedElement.flipH = !this.core.selectedElement.flipH;
                    this.core.saveState();
                    this.render.render();
                }
            });
        }
        
        if (this.layerBtns.flipV) {
            this.layerBtns.flipV.addEventListener('click', () => {
                if (this.core.selectedElement && (this.core.selectedElement.type === 'shape' || this.core.selectedElement.type === 'image')) {
                    this.core.selectedElement.flipV = !this.core.selectedElement.flipV;
                    this.core.saveState();
                    this.render.render();
                }
            });
        }
    }
    
    setupCanvasEvents() {
        this.core.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.core.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.core.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.core.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
        this.core.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        this.core.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.core.canvas.addEventListener('wheel', this.onWheel.bind(this));
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onMouseDown(e) {
        const rect = this.core.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.core.isPanning = true;
            this.core.panStart = { x, y };
            this.core.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (this.core.currentTool === 'pen') {
            this.core.isDrawing = true;
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            this.core.drawStart = { x: canvasX, y: canvasY };
            this.core.currentPath = [{ x: canvasX, y: canvasY }];
        } else if (this.core.currentTool === 'eraser') {
            this.core.isDrawing = true;
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            this.core.eraseAt(canvasX, canvasY);
        } else if (this.core.currentTool === 'select' || this.core.currentTool === 'move') {
            const handle = this.core.getResizeHandleAt(x, y);
            if (handle) {
                e.preventDefault();
                this.core.isResizing = true;
                this.core.resizeHandle = handle;
                this.core.resizeStart = { x, y };
                this.core.resizeOrig = {
                    width: this.core.selectedElement.width,
                    height: this.core.selectedElement.height,
                    x: this.core.selectedElement.x,
                    y: this.core.selectedElement.y
                };
                this.core.isProportionalResize = !e.button;
            } else {
                const element = this.core.getElementAt(x, y);
                if (element) {
                    if (e.ctrlKey || e.metaKey) {
                        const idx = this.core.selectedElements.indexOf(element);
                        if (idx > -1) {
                            this.core.selectedElements.splice(idx, 1);
                        } else {
                            this.core.selectedElements.push(element);
                        }
                        this.core.selectedElement = element;
                    } else {
                        this.core.selectedElements = [element];
                        this.core.selectedElement = element;
                    }
                    this.core.isMoving = true;
                    this.core.moveStart = { x: x - element.x, y: y - element.y };
                } else {
                    this.core.isSelecting = true;
                    this.core.selectStart = { x, y };
                    this.core.selectedElement = null;
                    if (!e.ctrlKey && !e.metaKey) {
                        this.core.selectedElements = [];
                    }
                }
            }
            this.render.render();
        }
    }
    
    onMouseMove(e) {
        const rect = this.core.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.core.isPanning) {
            const dx = x - this.core.panStart.x;
            const dy = y - this.core.panStart.y;
            this.core.canvasOffset.x += dx;
            this.core.canvasOffset.y += dy;
            this.core.panStart = { x, y };
            this.render.render();
            return;
        }
        
        if (this.core.isDrawing && this.core.currentTool === 'pen') {
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            this.core.currentPath.push({ x: canvasX, y: canvasY });
            this.render.render();
        } else if (this.core.isDrawing && this.core.currentTool === 'eraser') {
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            this.core.eraseAt(canvasX, canvasY);
            this.render.render();
        } else if (this.core.isResizing && this.core.selectedElement) {
            this.handleResize(x, y);
        } else if (this.core.isMoving && this.core.selectedElements.length > 0) {
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            
            this.core.selectedElements.forEach(el => {
                el.x = canvasX - this.core.moveStart.x;
                el.y = canvasY - this.core.moveStart.y;
            });
            
            this.render.render();
        } else if (this.core.isSelecting) {
            const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
            const canvasStartX = (this.core.selectStart.x - this.core.canvasOffset.x) / this.core.canvasScale;
            const canvasStartY = (this.core.selectStart.y - this.core.canvasOffset.y) / this.core.canvasScale;
            
            this.core.selectBox = {
                x: Math.min(canvasStartX, canvasX),
                y: Math.min(canvasStartY, canvasY),
                width: Math.abs(canvasX - canvasStartX),
                height: Math.abs(canvasY - canvasStartY)
            };
            this.render.render();
        }
    }
    
    handleResize(x, y) {
        const canvasX = (x - this.core.canvasOffset.x) / this.core.canvasScale;
        const canvasY = (y - this.core.canvasOffset.y) / this.core.canvasScale;
        const canvasStartX = (this.core.resizeStart.x - this.core.canvasOffset.x) / this.core.canvasScale;
        const canvasStartY = (this.core.resizeStart.y - this.core.canvasOffset.y) / this.core.canvasScale;
        const dx = canvasX - canvasStartX;
        const dy = canvasY - canvasStartY;
        
        let newWidth = this.core.resizeOrig.width;
        let newHeight = this.core.resizeOrig.height;
        let newX = this.core.resizeOrig.x;
        let newY = this.core.resizeOrig.y;
        
        const minSize = 20;
        
        if (this.core.resizeHandle === 'se' || this.core.resizeHandle === 'ne' ||
            this.core.resizeHandle === 'sw' || this.core.resizeHandle === 'nw') {
            if (this.core.isProportionalResize) {
                const ratio = this.core.resizeOrig.width / this.core.resizeOrig.height;
                if (this.core.resizeHandle === 'se') {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
                    newHeight = Math.max(minSize, newWidth / ratio);
                } else if (this.core.resizeHandle === 'ne') {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
                    newHeight = Math.max(minSize, newWidth / ratio);
                    newY = this.core.resizeOrig.y + (this.core.resizeOrig.height - newHeight);
                } else if (this.core.resizeHandle === 'sw') {
                    newHeight = Math.max(minSize, this.core.resizeOrig.height + dy);
                    newWidth = Math.max(minSize, newHeight * ratio);
                    newX = this.core.resizeOrig.x + (this.core.resizeOrig.width - newWidth);
                } else {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
                    newHeight = Math.max(minSize, newWidth / ratio);
                    newX = this.core.resizeOrig.x + (this.core.resizeOrig.width - newWidth);
                    newY = this.core.resizeOrig.y + (this.core.resizeOrig.height - newHeight);
                }
            } else {
                if (this.core.resizeHandle === 'se') {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
                    newHeight = Math.max(minSize, this.core.resizeOrig.height + dy);
                } else if (this.core.resizeHandle === 'ne') {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
                    newHeight = Math.max(minSize, this.core.resizeOrig.height - dy);
                    newY = this.core.resizeOrig.y + dy;
                } else if (this.core.resizeHandle === 'sw') {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width - dx);
                    newHeight = Math.max(minSize, this.core.resizeOrig.height + dy);
                    newX = this.core.resizeOrig.x + dx;
                } else {
                    newWidth = Math.max(minSize, this.core.resizeOrig.width - dx);
                    newHeight = Math.max(minSize, this.core.resizeOrig.height - dy);
                    newX = this.core.resizeOrig.x + dx;
                    newY = this.core.resizeOrig.y + dy;
                }
            }
        } else {
            if (this.core.resizeHandle === 'n') {
                newHeight = Math.max(minSize, this.core.resizeOrig.height - dy);
                newY = this.core.resizeOrig.y + dy;
            } else if (this.core.resizeHandle === 's') {
                newHeight = Math.max(minSize, this.core.resizeOrig.height + dy);
            } else if (this.core.resizeHandle === 'w') {
                newWidth = Math.max(minSize, this.core.resizeOrig.width - dx);
                newX = this.core.resizeOrig.x + dx;
            } else if (this.core.resizeHandle === 'e') {
                newWidth = Math.max(minSize, this.core.resizeOrig.width + dx);
            }
        }
        
        this.core.selectedElement.width = newWidth;
        this.core.selectedElement.height = newHeight;
        this.core.selectedElement.x = newX;
        this.core.selectedElement.y = newY;
        
        this.render.render();
    }
    
    onMouseUp() {
        if (this.core.isPanning) {
            this.core.isPanning = false;
            this.core.canvas.style.cursor = 'default';
            return;
        }
        
        if (this.core.isDrawing && this.core.currentTool === 'pen' && this.core.currentPath && this.core.currentPath.length > 1) {
            this.core.penPaths.push({
                points: [...this.core.currentPath],
                color: this.core.currentColor,
                width: 2
            });
            this.core.saveState();
        }
        if (this.core.isResizing) {
            this.core.saveState();
        }
        if (this.core.isSelecting && this.core.selectBox && this.core.selectBox.width > 5 && this.core.selectBox.height > 5) {
            this.core.selectElementsInBox();
        }
        
        this.core.isDrawing = false;
        this.core.isMoving = false;
        this.core.isResizing = false;
        this.core.isSelecting = false;
        this.core.resizeHandle = null;
        this.core.selectBox = null;
        this.core.currentPath = [];
        this.render.render();
    }
    
    onDoubleClick(e) {
        const rect = this.core.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const element = this.core.getElementAt(x, y);
        if (element && element.type === 'text') {
            this.core.editText(element);
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.core.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.1, Math.min(5, this.core.canvasScale + delta));
        
        if (newScale !== this.core.canvasScale) {
            const worldX = (mouseX - this.core.canvasOffset.x) / this.core.canvasScale;
            const worldY = (mouseY - this.core.canvasOffset.y) / this.core.canvasScale;
            
            this.core.canvasScale = newScale;
            this.core.canvasOffset.x = mouseX - worldX * this.core.canvasScale;
            this.core.canvasOffset.y = mouseY - worldY * this.core.canvasScale;
            
            const zoomInput = document.querySelector('.mdui-textfield-input[placeholder="输入缩放"]');
            if (zoomInput) zoomInput.value = Math.round(this.core.canvasScale * 100);
            
            this.render.render();
        }
    }
    
    setupZoomControl() {
        const zoomInput = document.querySelector('.mdui-textfield-input[placeholder="输入缩放"]');
        const zoomAddBtn = document.querySelector('.mdui-btn:has(.mdui-btn-icon .material-icons:contains("add"))');
        const zoomRemoveBtn = document.querySelector('.mdui-btn:has(.mdui-btn-icon .material-icons:contains("remove"))');
        
        if (zoomInput) {
            zoomInput.value = '100';
            zoomInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value > 0 && value <= 500) {
                    this.core.setZoom(value / 100);
                } else {
                    e.target.value = Math.round(this.core.canvasScale * 100);
                }
            });
        }
        
        if (zoomAddBtn) {
            zoomAddBtn.addEventListener('click', () => {
                this.core.setZoom(this.core.canvasScale + 0.1);
                if (zoomInput) zoomInput.value = Math.round(this.core.canvasScale * 100);
            });
        }
        
        if (zoomRemoveBtn) {
            zoomRemoveBtn.addEventListener('click', () => {
                this.core.setZoom(Math.max(0.1, this.core.canvasScale - 0.1));
                if (zoomInput) zoomInput.value = Math.round(this.core.canvasScale * 100);
            });
        }
    }
    
    setupHistoryEvents() {
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => this.core.undo());
        }
        if (this.redoBtn) {
            this.redoBtn.addEventListener('click', () => this.core.redo());
        }
    }
    
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            const activeEl = document.activeElement;
            const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
            
            if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
                if (this.core.selectedElements.length > 0) {
                    e.preventDefault();
                    this.core.deleteSelectedElements();
                }
            }
        });
    }
    
    setupFrameEvents() {
        if (!this.addFrameBtn) {
            console.warn('添加帧按钮未找到');
            return;
        }
        this.addFrameBtn.addEventListener('click', () => {
            this.core.addNewFrame();
        });
    }
    
    setupExportEvent() {
        if (!this.exportBtn) {
            console.warn('导出按钮未找到');
            return;
        }
        this.exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showExportMenu();
        });
    }
    
    setupContextMenuBlock() {
        this.core.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('contextmenu', (e) => {
            if (e.target === this.core.canvas || e.target.closest('#canvas')) {
                e.preventDefault();
            }
        });
    }
    
    showExportMenu() {
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.top = '50%';
        menu.style.left = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '20px';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.zIndex = '1000';
        menu.style.minWidth = '250px';
        
        const title = document.createElement('h3');
        title.textContent = '导出选项';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.fontSize = '16px';
        menu.appendChild(title);
        
        const options = [
            { text: '导出当前帧为PNG', action: () => this.exportCurrentFramePNG() },
            { text: '导出当前帧为SVG', action: () => this.exportCurrentFrameSVG() },
            { text: '导出全部帧为PNG', action: () => this.exportAllFramesPNG() },
            { text: '导出全部帧为SVG', action: () => this.exportAllFramesSVG() }
        ];
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.text;
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.padding = '10px';
            btn.style.margin = '8px 0';
            btn.style.background = '#7b61ff';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#6a4de6';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#7b61ff';
            });
            btn.addEventListener('click', () => {
                document.body.removeChild(menu);
                opt.action();
            });
            menu.appendChild(btn);
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.display = 'block';
        cancelBtn.style.width = '100%';
        cancelBtn.style.padding = '10px';
        cancelBtn.style.margin = '8px 0';
        cancelBtn.style.background = '#e0e0e0';
        cancelBtn.style.color = '#333';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.fontSize = '14px';
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#d0d0d0';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#e0e0e0';
        });
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(menu);
        });
        menu.appendChild(cancelBtn);
        
        document.body.appendChild(menu);
        
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.addEventListener('click', closeMenuOnce);
        
        function closeMenuOnce() {
            document.removeEventListener('click', closeMenuOnce);
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        }
    }
    
    exportCurrentFramePNG() {
        const bounds = this.getBounds();
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = 'transparent';
        tempCtx.fillRect(0, 0, bounds.width, bounds.height);
        
        this.core.penPaths.forEach(path => {
            tempCtx.beginPath();
            tempCtx.strokeStyle = path.color;
            tempCtx.lineWidth = path.width;
            tempCtx.lineCap = 'round';
            tempCtx.lineJoin = 'round';
            if (path.points.length > 0) {
                tempCtx.moveTo(path.points[0].x - bounds.x, path.points[0].y - bounds.y);
                for (let i = 1; i < path.points.length; i++) {
                    tempCtx.lineTo(path.points[i].x - bounds.x, path.points[i].y - bounds.y);
                }
                tempCtx.stroke();
            }
        });
        
        const sorted = [...this.core.elements].sort((a, b) => a.zIndex - b.zIndex);
        sorted.forEach(element => {
            tempCtx.save();
            
            if (element.type === 'shape') {
                const x = element.x - bounds.x;
                const y = element.y - bounds.y;
                
                tempCtx.translate(x + element.width / 2, y + element.height / 2);
                
                if (element.flipH) tempCtx.scale(-1, 1);
                if (element.flipV) tempCtx.scale(1, -1);
                
                tempCtx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
                
                if (element.color) {
                    tempCtx.globalCompositeOperation = 'source-in';
                    tempCtx.fillStyle = element.color;
                    tempCtx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height);
                    tempCtx.globalCompositeOperation = 'source-over';
                }
            } else if (element.type === 'image') {
                const x = element.x - bounds.x;
                const y = element.y - bounds.y;
                
                tempCtx.translate(x + element.width / 2, y + element.height / 2);
                
                if (element.flipH) tempCtx.scale(-1, 1);
                if (element.flipV) tempCtx.scale(1, -1);
                
                tempCtx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
            } else if (element.type === 'text') {
                const x = element.x - bounds.x;
                const y = element.y - bounds.y;
                
                tempCtx.font = `${element.fontSize}px Arial`;
                tempCtx.fillStyle = element.color;
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'top';
                tempCtx.fillText(element.text, x + element.width / 2, y);
            }
            
            tempCtx.restore();
        });
        
        const dataUrl = tempCanvas.toDataURL('image/png');
        const filename = this.core.frames.length > 1 ? `frame_${this.core.currentFrameIndex + 1}.png` : 'frame.png';
        this.downloadFile(dataUrl, filename, 'image/png');
    }
    
    exportCurrentFrameSVG() {
        const bounds = this.getBounds();
        const svg = this.generateSVG(bounds);
        this.downloadFile('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), 'frame.svg', 'image/svg+xml');
    }
    
    exportAllFramesPNG() {
        let delay = 0;
        this.core.frames.forEach((frame, index) => {
            setTimeout(() => {
                this.core.currentFrameIndex = index;
                this.exportCurrentFramePNG();
            }, delay);
            delay += 100;
        });
    }
    
    exportAllFramesSVG() {
        let delay = 0;
        this.core.frames.forEach((frame, index) => {
            setTimeout(() => {
                this.core.currentFrameIndex = index;
                const bounds = this.getBounds();
                const svg = this.generateSVG(bounds);
                this.downloadFile('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), `frame_${index + 1}.svg`, 'image/svg+xml');
            }, delay);
            delay += 100;
        });
    }
    
    getBounds() {
        let minX = this.core.canvas.width, minY = this.core.canvas.height;
        let maxX = 0, maxY = 0;
        
        this.core.elements.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
        });
        
        this.core.penPaths.forEach(path => {
            path.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });
        
        if (minX >= maxX) {
            return { x: 0, y: 0, width: this.core.canvas.width, height: this.core.canvas.height };
        }
        
        return {
            x: Math.max(0, minX - 10),
            y: Math.max(0, minY - 10),
            width: maxX - minX + 20,
            height: maxY - minY + 20
        };
    }
    
    generateSVG(bounds) {
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">`;
        
        this.core.penPaths.forEach(path => {
            if (path.points.length < 2) return;
            let d = `M ${path.points[0].x - bounds.x} ${path.points[0].y - bounds.y}`;
            for (let i = 1; i < path.points.length; i++) {
                d += ` L ${path.points[i].x - bounds.x} ${path.points[i].y - bounds.y}`;
            }
            svg += `<path d="${d}" stroke="${path.color}" stroke-width="${path.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        });
        
        const sorted = [...this.core.elements].sort((a, b) => a.zIndex - b.zIndex);
        sorted.forEach(element => {
            const x = element.x - bounds.x;
            const y = element.y - bounds.y;
            
            if (element.type === 'shape') {
                let transformParts = [];
                if (element.flipH) transformParts.push('scale(-1 1)');
                if (element.flipV) transformParts.push('scale(1 -1)');
                
                let transform = '';
                let finalX = x;
                let finalY = y;
                
                if (transformParts.length > 0) {
                    const originX = element.width / 2;
                    const originY = element.height / 2;
                    transform = ` transform="translate(${x + originX}, ${y + originY}) ${transformParts.join(' ')} translate(${-originX}, ${-originY})"`;
                    finalX = 0;
                    finalY = 0;
                }
                
                const imgSrc = element.img.src;
                const isBase64 = imgSrc.startsWith('data:');
                const href = isBase64 ? imgSrc : encodeURI(imgSrc);
                
                svg += `<image${transform} x="${finalX}" y="${finalY}" width="${element.width}" height="${element.height}" xlink:href="${href}"/>`;
                
                if (element.color) {
                    svg += `<rect${transform} x="${finalX}" y="${finalY}" width="${element.width}" height="${element.height}" fill="${element.color}" opacity="0.9"/>`;
                }
            } else if (element.type === 'image') {
                let transformParts = [];
                if (element.flipH) transformParts.push('scale(-1 1)');
                if (element.flipV) transformParts.push('scale(1 -1)');
                
                let transform = '';
                let finalX = x;
                let finalY = y;
                
                if (transformParts.length > 0) {
                    const originX = element.width / 2;
                    const originY = element.height / 2;
                    transform = ` transform="translate(${x + originX}, ${y + originY}) ${transformParts.join(' ')} translate(${-originX}, ${-originY})"`;
                    finalX = 0;
                    finalY = 0;
                }
                
                const imgSrc = element.img.src;
                const isBase64 = imgSrc.startsWith('data:');
                const href = isBase64 ? imgSrc : encodeURI(imgSrc);
                
                svg += `<image${transform} x="${finalX}" y="${finalY}" width="${element.width}" height="${element.height}" xlink:href="${href}"/>`;
            } else if (element.type === 'text') {
                svg += `<text x="${x + element.width/2}" y="${y + element.fontSize}" font-size="${element.fontSize}px" font-family="Arial, sans-serif" fill="${element.color}" text-anchor="middle">${this.escapeXml(element.text)}</text>`;
            }
        });
        
        svg += '</svg>';
        return svg;
    }
    
    escapeXml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    downloadFile(dataUrl, filename, mimeType) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}