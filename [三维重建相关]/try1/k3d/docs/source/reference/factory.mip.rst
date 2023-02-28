.. _mip:

===
mip
===

.. autofunction:: k3d.factory.mip

.. seealso::
    - :ref:`volume`

--------
Examples
--------

Render mhd volumetric data
^^^^^^^^^^^^^^^^^^^^^^^^^^

:download:`heart.mhd <./assets/factory/heart.mhd>`
:download:`heart.zraw <./assets/factory/heart.zraw>`

.. code-block:: python3

    import k3d
    import numpy as np
    import SimpleITK as sitk

    im_sitk = sitk.ReadImage('heart.mhd')
    img = sitk.GetArrayFromImage(im_sitk)

    plt_mip = k3d.mip(img.astype(np.float32))

    plot = k3d.plot()
    plot += plt_mip
    plot.display()

.. k3d_plot ::
  :filename: plots/factory/mip_render_mhd_plot.py

Colormap
^^^^^^^^

:download:`heart.mhd <./assets/factory/heart.mhd>`
:download:`heart.zraw <./assets/factory/heart.zraw>`

.. code-block:: python3

    import k3d
    import numpy as np
    import SimpleITK as sitk
    from k3d.colormaps import matplotlib_color_maps

    im_sitk = sitk.ReadImage('heart.mhd')
    img = sitk.GetArrayFromImage(im_sitk)

    plt_mip = k3d.mip(img.astype(np.float32),
                      color_map=matplotlib_color_maps.Turbo,
                      color_range=[100, 750])

    plot = k3d.plot()
    plot += plt_mip
    plot.display()

.. k3d_plot ::
  :filename: plots/factory/mip_colormap_plot.py


Mask
^^^^

:download:`heart.mhd <./assets/factory/heart.mhd>`
:download:`heart.zraw <./assets/factory/heart.zraw>`
:download:`heart.mhd <./assets/factory/mask.mhd>`
:download:`heart.zraw <./assets/factory/mask.zraw>`

.. code-block:: python3

    import k3d
    import numpy as np
    import SimpleITK as sitk

    im_sitk = sitk.ReadImage('heart.mhd')
    img = sitk.GetArrayFromImage(im_sitk)

    mask_sitk = sitk.ReadImage('mask.mhd')
    mask = sitk.GetArrayFromImage(mask_sitk)

    plt_mip = k3d.mip(img.astype(np.float32),
                      mask=mask.astype(np.uint8),
                      mask_opacities=[0.025, 3.0],
                      color_range=[0, 700])

    plot = k3d.plot()
    plot += plt_mip
    plot.display()

.. k3d_plot ::
    :filename: plots/factory/mip_mask_plot.py

