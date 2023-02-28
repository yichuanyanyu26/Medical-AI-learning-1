.. _Octahedron:

==========
Octahedron
==========

.. autoclass:: k3d.platonic.Octahedron
    :members:
    :show-inheritance:

.. seealso::
    - :ref:`Cube`
    - :ref:`Dodecahedron`
    - :ref:`Icosahedron`
    - :ref:`Tetrahedron`

-------
Example
-------

.. code-block:: python3

    import k3d
    from k3d import platonic

    plot = k3d.plot()

    octa_1 = platonic.Octahedron()
    octa_2 = platonic.Octahedron(origin=[5, -2, 3], size=0.5)

    plot += octa_1.mesh
    plot += octa_2.mesh

    plot.display()

.. k3d_plot ::
  :filename: plots/factory/octahedron_plot.py