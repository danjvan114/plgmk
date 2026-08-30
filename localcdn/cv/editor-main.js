document.addEventListener('DOMContentLoaded', () => {
    const core = new CanvasEditorCore();
    const render = new CanvasEditorRender(core);
    const events = new CanvasEditorEvents(core, render);
    
    core.render = render.render.bind(render);
    
    render.render();
});