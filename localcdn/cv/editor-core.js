class CanvasEditorCore {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.width = 1200;
        this.canvas.height = 800;
        
        this.currentTool = 'select';
        this.currentColor = '#F12629';
        this.frames = [{
            elements: [],
            penPaths: []
        }];
        this.currentFrameIndex = 0;
        this.selectedElement = null;
        this.selectedElements = [];
        this.isDrawing = false;
        this.isMoving = false;
        this.isResizing = false;
        this.isSelecting = false;
        this.isPanning = false;
        this.resizeHandle = null;
        this.resizeStart = { x: 0, y: 0 };
        this.resizeOrig = { width: 0, height: 0, x: 0, y: 0 };
        this.moveStart = { x: 0, y: 0 };
        this.drawStart = { x: 0, y: 0 };
        this.selectStart = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        this.selectBox = null;
        this.history = [];
        this.historyIndex = -1;
        this.canvasScale = 1;
        this.canvasOffset = { x: 0, y: 0 };
        this.resizeHandleSize = 8;
        
        this.init();
    }
    
    get elements() {
        return this.frames[this.currentFrameIndex].elements;
    }
    
    get penPaths() {
        return this.frames[this.currentFrameIndex].penPaths;
    }
    
    init() {
        this.setupUIEvents();
        this.setupCanvasEvents();
        this.saveState();
    }
    
    saveState() {
        const state = {
            currentFrameIndex: this.currentFrameIndex,
            frames: this.frames.map(frame => ({
                elements: JSON.parse(JSON.stringify(frame.elements.map(e => {
                    const copy = { ...e };
                    delete copy.img;
                    return copy;
                }))),
                penPaths: JSON.parse(JSON.stringify(frame.penPaths)),
                images: frame.elements.filter(e => e.type === 'shape' || e.type === 'image').map(e => e.img?.src || '')
            }))
        };
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    restoreState(state) {
        this.currentFrameIndex = state.currentFrameIndex;
        this.frames = state.frames.map(frame => {
            const newFrame = {
                elements: [],
                penPaths: frame.penPaths
            };
            
            let loadedCount = 0;
            const totalImages = frame.elements.filter(e => e.type === 'shape' || e.type === 'image').length;
            
            frame.elements.forEach((data, index) => {
                if (data.type === 'shape' || data.type === 'image') {
                    const existingEl = this.frames[this.currentFrameIndex]?.elements[index];
                    if (existingEl && existingEl.img && existingEl.img.src === frame.images[index]) {
                        newFrame.elements[index] = { ...data, img: existingEl.img };
                        loadedCount++;
                        if (loadedCount === totalImages) {
                            this.render();
                        }
                    } else {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            newFrame.elements[index] = { ...data, img };
                            loadedCount++;
                            if (loadedCount === totalImages) {
                                this.render();
                            }
                        };
                        img.onerror = () => {
                            newFrame.elements[index] = data;
                            loadedCount++;
                            if (loadedCount === totalImages) {
                                this.render();
                            }
                        };
                        newFrame.elements[index] = { ...data, img };
                        img.src = frame.images[index];
                    }
                } else {
                    newFrame.elements[index] = data;
                }
            });
            
            if (totalImages === 0) {
                setTimeout(() => this.render(), 0);
            }
            
            return newFrame;
        });
        
        this.selectedElement = null;
    }
    
    addShape(src) {
        const existingImg = this.findCachedImage(src);
        if (existingImg) {
            this.createShapeElement(existingImg);
            return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.createShapeElement(img);
        };
        img.onerror = () => {
            console.error('Failed to load image:', src);
        };
        img.src = src;
    }
    
    createShapeElement(img) {
        const scale = Math.min(80 / img.width, 80 / img.height);
        const element = {
            type: 'shape',
            x: this.canvas.width / 2 - 40,
            y: this.canvas.height / 2 - 40,
            width: img.width * scale,
            height: img.height * scale,
            img: img,
            scale: scale,
            rotation: 0,
            flipH: false,
            flipV: false,
            zIndex: this.elements.length,
            color: this.currentColor
        };
        this.elements.push(element);
        this.selectedElement = element;
        this.selectedElements = [element];
        this.saveState();
        this.render();
    }
    
    findCachedImage(src) {
        for (const frame of this.frames) {
            for (const el of frame.elements) {
                if (el.img && el.img.src === src) {
                    return el.img;
                }
            }
        }
        return null;
    }
    
    addText(text) {
        const element = {
            type: 'text',
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height / 2,
            width: 100,
            height: 30,
            text: text,
            color: this.currentColor,
            fontSize: 24,
            zIndex: this.elements.length
        };
        this.elements.push(element);
        this.selectedElement = element;
        this.selectedElements = [element];
        this.saveState();
        this.render();
    }
    
    addImage(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(150 / img.width, 150 / img.height);
                const element = {
                    type: 'image',
                    x: this.canvas.width / 2 - 75,
                    y: this.canvas.height / 2 - 75,
                    width: img.width * scale,
                    height: img.height * scale,
                    img: img,
                    scale: scale,
                    rotation: 0,
                    flipH: false,
                    flipV: false,
                    zIndex: this.elements.length,
                    color: this.currentColor
                };
                this.elements.push(element);
                this.selectedElement = element;
                this.selectedElements = [element];
                this.saveState();
                this.render();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    deleteSelectedElements() {
        const toDelete = [...this.selectedElements];
        toDelete.forEach(el => {
            const idx = this.elements.indexOf(el);
            if (idx > -1) {
                this.elements.splice(idx, 1);
            }
        });
        this.selectedElements = [];
        this.selectedElement = null;
        this.saveState();
        this.render();
    }
    
    deleteElement(element) {
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            this.elements.splice(index, 1);
            this.saveState();
            this.render();
        }
    }
    
    moveLayer(element, delta) {
        const newIndex = element.zIndex + delta;
        if (newIndex >= 0 && newIndex < this.elements.length) {
            element.zIndex = newIndex;
            this.saveState();
            this.render();
        }
    }
    
    addNewFrame() {
        const newFrame = {
            elements: JSON.parse(JSON.stringify(this.elements.map(e => {
                const copy = { ...e };
                delete copy.img;
                return copy;
            }))),
            penPaths: JSON.parse(JSON.stringify(this.penPaths))
        };
        
        newFrame.elements.forEach((data, index) => {
            if (data.type === 'shape' || data.type === 'image') {
                const original = this.elements[index];
                if (original && original.img) {
                    newFrame.elements[index].img = original.img;
                }
            }
        });
        
        this.frames.push(newFrame);
        this.currentFrameIndex = this.frames.length - 1;
        this.selectedElement = null;
        this.selectedElements = [];
        this.saveState();
        this.render();
        
        alert(`已创建第 ${this.frames.length} 帧`);
    }
    
    setZoom(scale) {
        this.canvasScale = Math.max(0.1, Math.min(5, scale));
        this.render();
    }
    
    eraseAt(x, y) {
        const eraseRadius = 10;
        this.penPaths = this.penPaths.filter(path => {
            for (const point of path.points) {
                const dx = point.x - x;
                const dy = point.y - y;
                if (dx * dx + dy * dy < eraseRadius * eraseRadius) {
                    return false;
                }
            }
            return true;
        });
    }
    
    getElementAt(x, y) {
        const canvasX = (x - this.canvasOffset.x) / this.canvasScale;
        const canvasY = (y - this.canvasOffset.y) / this.canvasScale;
        
        const sorted = [...this.elements].sort((a, b) => b.zIndex - a.zIndex);
        for (const element of sorted) {
            if (canvasX >= element.x && canvasX <= element.x + element.width &&
                canvasY >= element.y && canvasY <= element.y + element.height) {
                return element;
            }
        }
        return null;
    }
    
    getResizeHandleAt(x, y) {
        if (!this.selectedElement) return null;
        
        const canvasX = (x - this.canvasOffset.x) / this.canvasScale;
        const canvasY = (y - this.canvasOffset.y) / this.canvasScale;
        
        const { x: elX, y: elY, width, height } = this.selectedElement;
        const size = this.resizeHandleSize / this.canvasScale;
        
        const handles = [
            { name: 'nw', x: elX, y: elY },
            { name: 'n', x: elX + width / 2, y: elY },
            { name: 'ne', x: elX + width, y: elY },
            { name: 'w', x: elX, y: elY + height / 2 },
            { name: 'e', x: elX + width, y: elY + height / 2 },
            { name: 'sw', x: elX, y: elY + height },
            { name: 's', x: elX + width / 2, y: elY + height },
            { name: 'se', x: elX + width, y: elY + height }
        ];
        
        for (const handle of handles) {
            if (Math.abs(canvasX - handle.x) <= size && Math.abs(canvasY - handle.y) <= size) {
                return handle.name;
            }
        }
        return null;
    }
    
    selectElementsInBox() {
        const box = this.selectBox;
        const found = this.elements.filter(el => {
            return el.x < box.x + box.width &&
                   el.x + el.width > box.x &&
                   el.y < box.y + box.height &&
                   el.y + el.height > box.y;
        });
        
        if (found.length > 0) {
            this.selectedElements = found;
            this.selectedElement = found[found.length - 1];
        }
    }
    
    editText(element) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = element.text;
        input.style.position = 'absolute';
        input.style.left = `${this.canvas.offsetLeft + element.x}px`;
        input.style.top = `${this.canvas.offsetTop + element.y}px`;
        input.style.width = `${element.width}px`;
        input.style.height = `${element.height}px`;
        input.style.fontSize = `${element.fontSize}px`;
        input.style.color = element.color;
        input.style.border = '1px solid #7b61ff';
        input.style.background = 'transparent';
        input.style.textAlign = 'center';
        input.style.outline = 'none';
        input.style.zIndex = '1000';
        
        input.addEventListener('blur', () => {
            element.text = input.value;
            document.body.removeChild(input);
            this.saveState();
            this.render();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                document.body.removeChild(input);
                this.render();
            }
        });
        
        document.body.appendChild(input);
        input.focus();
    }
}