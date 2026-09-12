"""A new magical copper vane: fixed weather signs and a rotating 3D arrow.

Blender --background --python-exit-code 1 --python scripts/blender/weather_vane.py -- --out /tmp/twilight-weather-vane
node scripts/blender/pack-weather-vane.mjs /tmp/twilight-weather-vane
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
scene.render.resolution_x = 192
scene.render.resolution_y = 320
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.world.color = (0.16, 0.16, 0.16)

def material(name, colour, metal=0, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Roughness'].default_value = 0.76
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Emission Color'].default_value = (*colour, 1)
    shader.inputs['Emission Strength'].default_value = glow
    if metal:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 18
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.25
        ramp.color_ramp.elements[0].color = (0.11, 0.22, 0.19, 1)
        ramp.color_ramp.elements[1].position = 0.75
        ramp.color_ramp.elements[1].color = (*colour, 1)
        mat.node_tree.links.new(noise.outputs['Fac'], ramp.inputs[0])
        mat.node_tree.links.new(ramp.outputs[0], shader.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.18
        bump.inputs['Distance'].default_value = 0.045
        mat.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat

copper = material('Weathered copper and green patina', (0.48, 0.29, 0.12), 0.35)
brass = material('Worn brass rim', (0.58, 0.4, 0.18), 0.25)
enamel = material('Midnight teal enamel', (0.022, 0.065, 0.073))
sign_materials = {
    'clear': material('Sun gold', (0.95, 0.66, 0.22), glow=0.25),
    'rain': material('Rain blue', (0.36, 0.68, 0.85), glow=0.25),
    'snow': material('Snow ivory', (0.79, 0.89, 0.85), glow=0.25),
    'fog': material('Fog grey lavender', (0.63, 0.62, 0.74), glow=0.2),
    'mist': material('Mist sea green', (0.45, 0.81, 0.72), glow=0.2),
    'storm': material('Storm amber', (0.97, 0.73, 0.29), glow=0.25),
    'cherry_blossoms': material('Blossom pink', (0.93, 0.47, 0.62), glow=0.25),
}

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def sphere(name, position, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=position)
    obj = finish(bpy.context.object, name, mat)
    obj.scale = scale
    bpy.ops.object.shade_smooth()
    return obj

def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)

def disc(name, centre, radius, thickness, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=thickness,
                                      location=centre, rotation=(math.pi / 2, 0, 0))
    return finish(bpy.context.object, name, mat)

def plate(name, points, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(x, 0, z) for x, z in points], [], [list(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, name, mat)
    solid = obj.modifiers.new('Thin forged copper', 'SOLIDIFY')
    solid.thickness = 0.04
    bevel = obj.modifiers.new('Worn edges', 'BEVEL')
    bevel.width = 0.014
    bevel.segments = 2
    return obj

# A fixed, readable instrument beneath the rotating arrow.
tube('Slightly bent spindle', [(0, 0, 0.02), (0.016, 0, 0.65), (-0.012, 0, 1.1), (0, 0, 2.49)], 0.032, copper)
for z, radius in [(0.08, 0.11), (0.22, 0.065), (1.01, 0.075), (2.3, 0.06)]:
    sphere('Spindle collar', (0, 0, z), (radius, radius, 0.045), brass)
disc('Brass weather dial', (0, -0.015, 1.53), 0.46, 0.07, brass)
disc('Dark enamel face', (0, -0.063, 1.53), 0.397, 0.05, enamel)
for i in range(12):
    angle = i * math.tau / 12
    sphere('Dial rivet', (math.sin(angle) * 0.429, -0.077, 1.53 + math.cos(angle) * 0.429),
           (0.018, 0.014, 0.018), copper)
for side in [-1, 1]:
    points = []
    for i in range(40):
        t = i / 39
        angle = t * math.pi * 1.8
        radius = 0.23 * (1 - t * 0.73)
        points.append((side * (0.18 + math.sin(angle) * radius), 0.02, 0.72 + math.cos(angle) * radius))
    tube('Curled copper brace', points, 0.018, copper)
base_objects = list(scene.objects)

rotor = bpy.data.objects.new('Turning arrow', None)
bpy.context.collection.objects.link(rotor)
rotor.location.z = 2.34
parts = [
    tube('Arrow shaft', [(-0.76, 0, 0), (0.86, 0, 0)], 0.026, brass),
    plate('Arrow head', [(0.53, -0.13), (0.89, 0), (0.53, 0.13), (0.6, 0)], copper),
    plate('Leaf counterweight', [(-0.45, 0), (-0.69, 0.22), (-0.85, 0.16), (-0.8, -0.1), (-0.56, -0.12)], copper),
    sphere('Arrow pivot', (0, 0, 0), (0.07, 0.07, 0.07), brass),
]
for part in parts:
    part.parent = rotor

signs = {}
for weather, mat in sign_materials.items():
    before = set(scene.objects)
    def mark(points, thickness=0.027):
        return tube(weather, [(x, -0.13, 1.53 + z) for x, z in points], thickness, mat)
    def bead(x, z, rx, rz):
        return sphere(weather, (x, -0.13, 1.53 + z), (rx, 0.025, rz), mat)
    if weather == 'clear':
        bead(0, 0, 0.14, 0.14)
        for i in range(8):
            a = i * math.tau / 8
            mark([(math.sin(a) * 0.205, math.cos(a) * 0.205),
                  (math.sin(a) * 0.28, math.cos(a) * 0.28)], 0.02)
    elif weather in ['rain', 'storm']:
        bead(-0.12, 0.13, 0.1, 0.075)
        bead(0, 0.18, 0.12, 0.105)
        bead(0.13, 0.12, 0.095, 0.07)
        mark([(-0.15, 0.06), (0.16, 0.06)], 0.035)
        if weather == 'rain':
            for x in [-0.15, 0, 0.15]:
                mark([(x + 0.025, -0.075), (x - 0.025, -0.2)], 0.028)
        else:
            mark([(0.05, 0.035), (-0.07, -0.115), (0.07, -0.115), (-0.04, -0.29)], 0.037)
    elif weather == 'snow':
        for i in range(6):
            a = i * math.tau / 6
            x, z = math.sin(a), math.cos(a)
            mark([(0, 0), (x * 0.28, z * 0.28)], 0.024)
            for side in [-1, 1]:
                mark([(x * 0.15, z * 0.15),
                      (x * 0.21 + z * side * 0.065, z * 0.21 - x * side * 0.065)], 0.017)
    elif weather == 'fog':
        for z in [-0.17, 0, 0.17]:
            mark([(-0.27 + i * 0.54 / 20, z + math.sin(i * 0.28) * 0.028) for i in range(21)], 0.035)
    elif weather == 'mist':
        for side in [-1, 1]:
            mark([(side * 0.115 + math.sin(i * 0.25) * 0.06, -0.15 + i * 0.016) for i in range(23)], 0.023)
        bead(-0.19, -0.25, 0.022, 0.022)
        bead(0.04, -0.25, 0.022, 0.022)
        bead(0.2, -0.25, 0.022, 0.022)
    else:
        for i in range(5):
            a = i * math.tau / 5
            petal = bead(math.sin(a) * 0.16, math.cos(a) * 0.16, 0.085, 0.115)
            petal.rotation_euler.y = a
        sphere('Flower centre', (0, -0.17, 1.53), (0.055, 0.025, 0.055), sign_materials['clear'])
    signs[weather] = list(set(scene.objects) - before)

bpy.ops.object.camera_add(location=(0, -8, 3.2))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 1.35)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.15
scene.camera = camera
bpy.ops.object.light_add(type='AREA', location=(-3, -4, 6))
bpy.context.object.data.energy = 450
bpy.context.object.data.size = 5

def show(objects, visible):
    for obj in objects:
        obj.hide_render = not visible

def render(name):
    scene.render.filepath = str(out / name)
    bpy.ops.render.render(write_still=True)

for objects in signs.values():
    show(objects, False)
show(parts, False)
render('base.png')
show(base_objects, False)
show(parts, True)
scene.frame_end = 16
scene.render.fps = 12
for frame in range(16):
    rotor.rotation_euler.z = frame * math.tau / 16
    rotor.keyframe_insert(data_path='rotation_euler', frame=frame + 1)
    render(f'rotor-{frame:02d}.png')
show(parts, False)
for weather, objects in signs.items():
    show(objects, True)
    render(f'sign-{weather}.png')
    show(objects, False)
show(base_objects, True)
show(parts, True)
rotor.rotation_euler.z = -math.pi / 8
for weather, objects in signs.items():
    show(objects, True)
    render(f'preview-{weather}.png')
    show(objects, False)
show(signs['clear'], True)
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'weather-vane.blend'))
