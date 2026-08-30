class CanvasEditorRender {
    constructor(core) {
        this.core = core;
        this.ctx = core.ctx;
        this.canvas = core.canvas;
    }
    
    render() {
        this.clearCanvas();
        this.drawGrid();
        this.drawPenPaths();
        this.drawCurrentPath();
        this.drawElements();
        this.drawSelectBox();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fcfcfc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        this.ctx.save();
        this.ctx.translate(this.core.canvasOffset.x, this.core.canvasOffset.y);
        this.ctx.scale(this.core.canvasScale, this.core.canvasScale);
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1 / this.core.canvasScale;
        
        const gridSize = 20;
        const gridWidth = this.canvas.width * 2;
        const gridHeight = this.canvas.height * 2;
        
        for (let x = 0; x < gridWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, gridHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < gridHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(gridWidth, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawPenPaths() {
        this.ctx.save();
        this.ctx.translate(this.core.canvasOffset.x, this.core.canvasOffset.y);
        this.ctx.scale(this.core.canvasScale, this.core.canvasScale);
        
        this.core.penPaths.forEach(path => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = path.width;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            if (path.points.length > 0) {
                this.ctx.moveTo(path.points[0].x, path.points[0].y);
                for (let i = 1; i < path.points.length; i++) {
                    this.ctx.lineTo(path.points[i].x, path.points[i].y);
                }
                this.ctx.stroke();
            }
        });
        
        this.ctx.restore();
    }
    
    drawCurrentPath() {
        if (!this.core.isDrawing || this.core.currentTool !== 'pen' || !this.core.currentPath || this.core.currentPath.length === 0) {
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(this.core.canvasOffset.x, this.core.canvasOffset.y);
        this.ctx.scale(this.core.canvasScale, this.core.canvasScale);
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.core.currentColor;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.moveTo(this.core.currentPath[0].x, this.core.currentPath[0].y);
        for (let i = 1; i < this.core.currentPath.length; i++) {
            this.ctx.lineTo(this.core.currentPath[i].x, this.core.currentPath[i].y);
        }
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawElements() {
        this.ctx.save();
        this.ctx.translate(this.core.canvasOffset.x, this.core.canvasOffset.y);
        this.ctx.scale(this.core.canvasScale, this.core.canvasScale);
        
        const sorted = [...this.core.elements].sort((a, b) => a.zIndex - b.zIndex);
        
        sorted.forEach(element => {
            this.drawElement(element);
            
            if (this.core.selectedElements.includes(element)) {
                this.drawSelectionBox(element);
            }
        });
        
        this.ctx.restore();
    }
    
    drawElement(element) {
        this.ctx.save();
        
        if (element.type === 'shape') {
            this.drawShape(element);
        } else if (element.type === 'image') {
            this.drawImage(element);
        } else if (element.type === 'text') {
            this.drawText(element);
        }
        
        this.ctx.restore();
    }
    
    drawShape(element) {
        this.ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        
        if (element.flipH) {
            this.ctx.scale(-1, 1);
        }
        if (element.flipV) {
            this.ctx.scale(1, -1);
        }
        
        this.ctx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
        
        if (element.color) {
            this.ctx.globalCompositeOperation = 'source-in';
            this.ctx.fillStyle = element.color;
            this.ctx.fillRect(-element.width / 2, -element.height / 2, element.width, element.height);
            this.ctx.globalCompositeOperation = 'source-over';
        }
    }
    
    drawImage(element) {
        this.ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
        
        if (element.flipH) {
            this.ctx.scale(-1, 1);
        }
        if (element.flipV) {
            this.ctx.scale(1, -1);
        }
        
        this.ctx.drawImage(element.img, -element.width / 2, -element.height / 2, element.width, element.height);
    }
    
    drawText(element) {
        this.ctx.font = `${element.fontSize}px Arial`;
        this.ctx.fillStyle = element.color;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(element.text, element.x + element.width / 2, element.y + element.fontSize);
    }
    
    drawSelectionBox(element) {
        this.ctx.strokeStyle = '#7b61ff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        const size = this.core.resizeHandleSize / this.core.canvasScale;
        const corners = [
            { x: element.x, y: element.y },
            { x: element.x + element.width, y: element.y },
            { x: element.x, y: element.y + element.height },
            { x: element.x + element.width, y: element.y + element.height }
        ];
        
        corners.forEach(corner => {
            this.ctx.fillStyle = '#7b61ff';
            this.ctx.fillRect(corner.x - size / 2, corner.y - size / 2, size, size);
        });
        
        const edges = [
            { x: element.x + element.width / 2, y: element.y },
            { x: element.x + element.width / 2, y: element.y + element.height },
            { x: element.x, y: element.y + element.height / 2 },
            { x: element.x + element.width, y: element.y + element.height / 2 }
        ];
        
        edges.forEach(edge => {
            this.ctx.fillStyle = '#7b61ff';
            this.ctx.fillRect(edge.x - size / 2, edge.y - size / 2, size, size);
        });
    }
    
    drawSelectBox() {
        if (!this.core.selectBox) return;
        
        const box = this.core.selectBox;
        this.ctx.strokeStyle = '#7b61ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            box.x * this.core.canvasScale + this.core.canvasOffset.x,
            box.y * this.core.canvasScale + this.core.canvasOffset.y,
            box.width * this.core.canvasScale,
            box.height * this.core.canvasScale
        );
        this.ctx.setLineDash([]);
    }
}