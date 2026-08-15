import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const kAvatarBucket = 'avatars';
const kAvatarMaxBytes = 5 * 1024 * 1024;
const kAvatarAllowedExt = {'jpg', 'jpeg', 'png', 'webp'};

class AvatarUploadException implements Exception {
  AvatarUploadException(this.message);
  final String message;

  @override
  String toString() => message;
}

class AvatarUploadService {
  AvatarUploadService(this._client, {ImagePicker? picker})
      : _picker = picker ?? ImagePicker();

  final SupabaseClient _client;
  final ImagePicker _picker;

  Future<XFile?> pickFromGallery() {
    return _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
  }

  Future<String> uploadPicked(XFile file) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) {
      throw AvatarUploadException('Sign in to upload a photo.');
    }

    final ext = _extension(file.name.isNotEmpty ? file.name : file.path);
    if (!kAvatarAllowedExt.contains(ext)) {
      throw AvatarUploadException('Use a JPEG, PNG, or WebP image.');
    }

    final bytes = await file.readAsBytes();
    if (bytes.length > kAvatarMaxBytes) {
      throw AvatarUploadException('Keep the photo under 5 MB.');
    }

    final path = '$uid/avatar.$ext';
    await _client.storage.from(kAvatarBucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            upsert: true,
            contentType: _contentType(ext),
          ),
        );

    final publicUrl = _client.storage.from(kAvatarBucket).getPublicUrl(path);
    final cacheBusted =
        '$publicUrl?t=${DateTime.now().millisecondsSinceEpoch}';

    await _client.from('profiles').update({
      'avatar_url': cacheBusted,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', uid);

    return cacheBusted;
  }

  String _extension(String name) {
    final dot = name.lastIndexOf('.');
    if (dot < 0 || dot == name.length - 1) return '';
    return name.substring(dot + 1).toLowerCase();
  }

  String _contentType(String ext) {
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}
