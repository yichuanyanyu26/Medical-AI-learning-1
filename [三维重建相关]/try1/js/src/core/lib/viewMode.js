const viewModes = {
    view: 'view',
    add: 'add',
    change: 'change',
    callback: 'callback',
    manipulate: 'manipulate',
};

function viewModeGUI(gui, K3D) {
    gui.add(K3D.parameters, 'viewMode', {
        View: viewModes.view,
        Add: viewModes.add,
        Change: viewModes.change,
        Callback: viewModes.callback,
        Manipulate: viewModes.manipulate,
    }).name('Mode').onChange(
        (mode) => {
            K3D.setViewMode(mode);

            K3D.dispatch(K3D.events.PARAMETERS_CHANGE, {
                key: 'mode',
                value: mode,
            });
        },
    );
}

module.exports = {
    viewModeGUI,
    viewModes,
};
