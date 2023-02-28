.. _Cube:

====
Cube
====

.. autoclass:: k3d.platonic.Cube
    :members:
    :show-inheritance:

.. seealso::
    - :ref:`Dodecahedron`
    - :ref:`Icosahedron`
    - :ref:`Octahedron`
    - :ref:`Tetrahedron`

-------
Example
-------

.. code-block:: python3

    import k3d
    from k3d import platonic

    plot = k3d.plot()

    cube_1 = platonic.Cube()
    cube_2 = platonic.Cube(origin=[5, -2, 3], size=0.5)

    plot += cube_1.mesh
    plot += cube_2.mesh

    plot.display()

.. k3d_plot ::
  :filename: plots/factory/cube_plot.py