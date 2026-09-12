"""Render water only; never import or alter the game's painted formations.

Blender --background --python scripts/blender/cave_drip.py -- --out /tmp/cave-drip
Pack the frames with: node scripts/blender/pack-cave-drip.mjs /tmp/cave-drip
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 128
scene.render.resolution_y = 256
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.fps = 12
scene.frame_end = 24
scene.view_settings.view_transform = 'Standard'
scene.world.color = (0.12, 0.12, 0.12)

water = bpy.data.materials.new('Muted silver-blue water')
water.diffuse_color = (0.48, 0.65, 0.7, 1)
water.use_nodes = True
shader = water.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = water.diffuse_color
shader.inputs['Roughness'].default_value = 0.48
shader.inputs['Metallic'].default_value = 0.15

bpy.ops.object.camera_add(location=(0, -6, 3))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.7
scene.camera = camera
bpy.ops.object.light_add(type='AREA', location=(-2, -3, 5))
bpy.context.object.data.energy = 220
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 4

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16)
drop = bpy.context.object
drop.name = 'Water bead and falling drop'
for vertex in drop.data.vertices:
    # A modest tapered tip, rather than a perfect shiny sphere.
    taper = 1 - max(0, vertex.co.z) * 0.45
    vertex.co.x *= taper
    vertex.co.y *= taper
drop.data.materials.append(water)
bpy.ops.object.shade_smooth()

rings = []
for i in range(2):
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8,
                                   major_radius=1, minor_radius=0.025,
                                   location=(0, 0, -0.9))
    ring = bpy.context.object
    ring.name = f'Impact ripple {i + 1}'
    ring.data.materials.append(water)
    rings.append(ring)

splashes = []
for i in range(3):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8)
    splash = bpy.context.object
    splash.name = f'Tiny splash {i + 1}'
    splash.data.materials.append(water)
    splashes.append(splash)

for frame in range(24):
    scene.frame_set(frame + 1)
    falling = min(1, max(0, (frame - 4) / 9))
    bead_size = min(1, (frame + 1) / 5)
    drop.location = (0, 0, 0.95 - 1.8 * falling * falling)
    drop.scale = (0.045 * bead_size, 0.045 * bead_size,
                  (0.065 + falling * 0.055) * bead_size)
    drop.hide_render = frame >= 14
    for i, ring in enumerate(rings):
        progress = (frame - 14 - i * 2) / 9
        ring.hide_render = not 0 <= progress < 1
        radius = 0.04 + max(0, progress) * 0.38
        ring.scale = (radius, radius, max(0.05, 1 - progress))
    for i, splash in enumerate(splashes):
        progress = (frame - 14) / 5
        splash.hide_render = not 0 <= progress <= 1
        angle = i * math.tau / 3
        splash.location = (math.cos(angle) * progress * 0.2,
                           math.sin(angle) * progress * 0.2,
                           -0.87 + math.sin(progress * math.pi) * 0.16)
        splash.scale = (0.018, 0.018, 0.027)
    for obj in [drop, *rings, *splashes]:
        for prop in ['location', 'scale', 'hide_render']:
            obj.keyframe_insert(data_path=prop, frame=frame + 1)
    scene.render.filepath = str(out / f'frame-{frame:02d}.png')
    bpy.ops.render.render(write_still=True)

scene.frame_set(8)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'cave-drip.blend'))
