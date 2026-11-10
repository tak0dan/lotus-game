# Blender headless: decimate + scale + centre a downloaded image-to-3D GLB for the game.
# usage: blender -b -P tools/prep_scan.py -- raw.glb out.glb HEIGHT FACES TEXSIZE   (e.g. 1.5 45000 1024)
import bpy, sys, math
src, out, height, faces, tex = sys.argv[sys.argv.index('--')+1:][:5]
height=float(height); faces=int(faces); tex=int(tex)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
if len(meshes)>1: bpy.ops.object.join()
o=bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
n=len(o.data.polygons); print('faces before',n)
m=o.modifiers.new('d','DECIMATE'); m.ratio=min(1.0,faces/max(n,1)); m.use_collapse_triangulate=True
bpy.ops.object.modifier_apply(modifier='d'); print('faces after',len(o.data.polygons))
# scale to height, feet on z=0, centred in x/y
vs=[o.matrix_world@v.co for v in o.data.vertices]
zmin=min(v.z for v in vs); zmax=max(v.z for v in vs); s=height/(zmax-zmin)
o.scale=(s,s,s); bpy.ops.object.transform_apply(scale=True)
vs=[o.matrix_world@v.co for v in o.data.vertices]
cx=(min(v.x for v in vs)+max(v.x for v in vs))/2; cy=(min(v.y for v in vs)+max(v.y for v in vs))/2; zmin=min(v.z for v in vs)
o.location=(-cx,-cy,-zmin+0.11); bpy.ops.object.transform_apply(location=True)
print('size', o.dimensions)
for im in bpy.data.images:
    if im.size[0]>tex: im.scale(tex,tex)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=88, export_apply=True)
