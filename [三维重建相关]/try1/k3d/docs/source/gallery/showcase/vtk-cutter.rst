VTK cutter
===========

.. admonition:: References

    - :ref:`mesh`
    - :ref:`paraview_color_maps`
    - :ref:`plot`
    - :ref:`vtk_poly_data`

:download:`output_fem.vtu <./assets/output_fem.vtu>`

.. code-block:: python3

    # This example shows how you can visualize 3d unstructured mesh with scalars
    # using K3D-jupyter.

    # The data processing is performed by a server-side VTK pipeline:

    # - the volumetric data is converted by Python kernel to the surface mesh
    # - the surface mesh is cut by a plane which position and orientation
    #   can be interactively changed by an ipywidget slider
    # - the modified surface mesh with corresponding scalars is sent to
    #   the K3D-jupyter frontend and displayed

    # The data transfer is reduced and fully controllable,
    # so it scales as large volumetric meshes as your backend system can handle.

    import k3d
    import numpy as np
    import vtk
    from ipywidgets import FloatSlider, interact
    from k3d.colormaps import paraview_color_maps
    from vtk.util import numpy_support

    # First, you load vtu volumetric unstructured mesh data containing
    # velocity field from CFD simulation.

    filename = 'output_fem.vtu'
    reader = vtk.vtkXMLUnstructuredGridReader()
    reader.SetFileName(filename)
    reader.Update()
    grid = reader.GetOutput()
    bbox = np.array(grid.GetBounds()).reshape(3, 2)
    center = np.mean(bbox, axis=1)

    plane = vtk.vtkPlane()
    plane.SetOrigin(*center)
    plane.SetNormal(1, 0.3, 0)

    # Then you extract a surface of the volumetric mesh so that it can be
    # further visualized in K3D.
    # You can cut the volumetric mesh by a given plane first and then extract
    # its surface, allowing an easy inspection of the volumetric data.

    # Note that the most computationally intensive part is performed by
    # the Python backend and a small portion of the data are sent to the front-end.

    def vtk_ExtractSurface(vtk_outputport, vtk_o, vtk_n):
        plane.SetOrigin(*vtk_o)
        plane.SetNormal(*vtk_n)

        myExtractGeometry = vtk.vtkExtractGeometry()
        myExtractGeometry.SetInputConnection(vtk_outputport)
        myExtractGeometry.SetImplicitFunction(plane)
        myExtractGeometry.ExtractInsideOn()
        myExtractGeometry.SetExtractBoundaryCells(0)
        myExtractGeometry.Update()

        myExtractSurface = vtk.vtkDataSetSurfaceFilter()
        myExtractSurface.SetInputConnection(myExtractGeometry.GetOutputPort())
        myExtractSurface.Update()

        return myExtractSurface.GetOutput()

    def update_from_cut(reader, vtk_o, vtk_n, plt_vtk):
        poly_data = vtk_ExtractSurface(reader.GetOutputPort(), vtk_o, vtk_n)

        if poly_data.GetNumberOfCells() > 0:
            vertices, indices, attribute = get_mesh_data(poly_data)
            with plt_vtk.hold_sync():
                plt_vtk.vertices = vertices
                plt_vtk.indices = indices
                plt_vtk.attribute = attribute

    def get_mesh_data(poly_data, color_attribute=('Umag', 0.0, 0.1)):
        if poly_data.GetPolys().GetMaxCellSize() > 3:
            cut_triangles = vtk.vtkTriangleFilter()
            cut_triangles.SetInputData(poly_data)
            cut_triangles.Update()
            poly_data = cut_triangles.GetOutput()

        if color_attribute is not None:
            attribute = numpy_support.vtk_to_numpy(
                poly_data.GetPointData().GetArray(color_attribute[0]))
            color_range = color_attribute[1:3]
        else:
            attribute = []
            color_range = []

        vertices = numpy_support.vtk_to_numpy(poly_data.GetPoints().GetData())
        indices = numpy_support.vtk_to_numpy(poly_data.GetPolys().GetData()).reshape(-1, 4)[:, 1:4]

        return (np.array(vertices, np.float32),
                np.array(indices, np.uint32),
                np.array(attribute, np.float32))

    def clipping_plane_to_vtkPlane(clipping_plane):
        vtk_n = -np.array(clipping_plane[:3])
        vtk_o = clipping_plane[3] * vtk_n

        return (vtk_o, vtk_n)

    # Finally, you create K3D plot objects which will be updated with
    # new data coming out from cuts.

    vtk_n = np.array([0., .3, 0.])
    vtk_o = np.array([0.04984861, 20.03934663, 0.04888905])

    plot = k3d.plot(grid_visible=False)

    plt_vtk = k3d.vtk_poly_data(
        vtk_ExtractSurface(
            reader.GetOutputPort(),
            vtk_o, vtk_n
        ),
        color_attribute=('Umag', 0.0, 0.32),
        color_map=paraview_color_maps.Cool_to_Warm,
        side='double')

    plt_vtk.flat_shading = True
    plot += plt_vtk

    plt_mesh = k3d.vtk_poly_data(vtk_ExtractSurface(reader.GetOutputPort(), vtk_o, vtk_n))

    plt_mesh.wireframe = True
    plt_mesh.color = 0xaaaaaa
    plt_mesh.opacity = 0.2

    plot += plt_mesh

    # This function will update the plot with new data.
    # It performs the actual cut on the backend and updates mesh-objects
    # parameters on the frontend.

    update_from_cut(reader, center + 0.0, [1, 0, 0], plt_vtk)
    plot.display()

    plot.camera = [0.0647, 0.0341, 0.0517,
                   0.0492, 0.0393, 0.0508,
                   0.0146, 0.0627, 0.9979]

    # To add interactivity to the example, you can also an ipywidget slider
    # to change the position of the cutting plane.

    @interact(s = FloatSlider(min=-0.01, max=0.01, step=0.00004))
    def _(s):
        update_from_cut(reader, center + s,[1,0,0], plt_vtk)

.. k3d_plot ::
  :filename: plots/vtk_cutter_plot.py