#include <common>
#include <clipping_planes_pars_vertex>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;

void main() {
    vUv = uv;

    #include <begin_vertex>
    #include <project_vertex>

    #include <worldpos_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
}
