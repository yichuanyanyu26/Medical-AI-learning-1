attribute vec3 offset;
uniform float opacity;

varying vec3 vViewPosition;
varying vec3 vNormal;

#if (USE_PER_POINT_OPACITY == 1)
attribute float opacities;
#endif

varying float perPointOpacity;

#if (USE_COLOR_MAP == 1)
uniform sampler2D colormap;
uniform float low;
uniform float high;
attribute float attributes;
#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {
    #include <uv_vertex>
    #include <uv2_vertex>

    perPointOpacity = 1.0;

    #if (USE_PER_POINT_OPACITY == 1)
    perPointOpacity = opacities;
    #endif

    #if (USE_COLOR_MAP == 1)
    float scaled_px = (attributes - low) / (high - low);
    vec4 finalSphereColor = texture2D(colormap, vec2(scaled_px, 0.5));

    perPointOpacity = finalSphereColor.a * perPointOpacity;
    vColor = finalSphereColor.rgb;
    #else
    vColor = color.rgb;
    #endif

    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    vNormal = normalize(transformedNormal);

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <displacementmap_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    vViewPosition = -mvPosition.xyz;
    #include <worldpos_vertex>
    #include <envmap_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>
}
