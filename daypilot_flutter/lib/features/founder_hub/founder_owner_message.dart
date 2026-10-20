import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// A founding member the hub owner is allowed to message.
class MessageableFounder {
  const MessageableFounder({required this.userId, required this.label});

  final String userId;
  final String label;
}

class OwnerThreadDraft {
  const OwnerThreadDraft({
    required this.recipientUserId,
    required this.title,
    required this.body,
  });

  final String recipientUserId;
  final String title;
  final String body;
}

/// Founding rows with open access and a user id. Waitlist rows are not passed in.
List<MessageableFounder> messageableFounders(
  List<Map<String, dynamic>> founding,
) {
  final people = <MessageableFounder>[];
  for (final person in founding) {
    if (person['canMessage'] != true) continue;
    final userId = person['userId'];
    if (userId is! String || userId.trim().isEmpty) continue;
    people.add(
      MessageableFounder(
        userId: userId.trim(),
        label: founderDisplayLabel(person),
      ),
    );
  }
  return people;
}

String founderDisplayLabel(Map<String, dynamic> person) {
  final name = person['name'];
  if (name is String && name.trim().isNotEmpty) return name.trim();
  final email = person['email'];
  if (email is String && email.trim().isNotEmpty) return email.trim();
  final number = person['founderNumber'];
  if (number is num) {
    return 'Founder ${number.toInt().toString().padLeft(2, '0')}';
  }
  return 'Founding member';
}

/// Starting a thread is owner-only, and only when someone can be messaged.
bool showStartThreadControl({
  required bool isOwner,
  required List<MessageableFounder> founders,
}) {
  return isOwner && founders.isNotEmpty;
}

({OwnerThreadDraft? draft, String? error}) parseOwnerThread({
  required String? recipientUserId,
  required String title,
  required String body,
}) {
  final id = recipientUserId?.trim() ?? '';
  final subject = title.trim();
  final message = body.trim();
  if (id.isEmpty || id.length > 80) {
    return (draft: null, error: 'Choose a founding member.');
  }
  if (subject.isEmpty || subject.length > 120) {
    return (draft: null, error: 'Subject must be 1–120 characters.');
  }
  if (message.isEmpty || message.length > 4000) {
    return (draft: null, error: 'Message must be 1–4000 characters.');
  }
  return (
    draft: OwnerThreadDraft(recipientUserId: id, title: subject, body: message),
    error: null,
  );
}

/// Owner inbox and the hub owner can open any thread. A founder can open a
/// thread only when it does not name a different founder. Member rows from
/// the suggestions API omit `founderUserId` because they are already theirs.
bool canReadFounderThread({
  required Map<String, dynamic> thread,
  required String? viewerUserId,
  required bool isOwner,
}) {
  if (isOwner) return true;
  final founderId = thread['founderUserId'];
  if (founderId is! String || founderId.isEmpty) return true;
  return viewerUserId != null &&
      viewerUserId.isNotEmpty &&
      founderId == viewerUserId;
}

List<Map<String, dynamic>> threadsForFounderHub(
  List<Map<String, dynamic>> items, {
  String? viewerUserId,
}) {
  return items
      .where(
        (item) => canReadFounderThread(
          thread: item,
          viewerUserId: viewerUserId,
          isOwner: false,
        ),
      )
      .toList();
}

/// Owner-started threads have an owner reply and no founder submission.
bool isOwnerStartedThread(Map<String, dynamic> item) {
  final messages = item['messages'];
  if (messages is! List || messages.isEmpty) return false;
  var fromOwner = false;
  var fromFounder = false;
  for (final message in messages.whereType<Map>()) {
    if (message['kind'] == 'admin_reply') fromOwner = true;
    if (message['kind'] == 'founder') fromFounder = true;
  }
  return fromOwner && !fromFounder;
}

String hubThreadSubtitle(Map<String, dynamic> item) {
  if (isOwnerStartedThread(item)) {
    final status = item['statusLabel'];
    if (status is String && status.isNotEmpty) {
      return 'Message from DayPilot · $status';
    }
    return 'Message from DayPilot';
  }
  return '${item['categoryLabel']} · ${item['statusLabel']}';
}

String inboxThreadTitle(Map<String, dynamic> item) {
  final unread = item['ownerUnread'] == true ? ' · unread' : '';
  return '${item['title']}$unread';
}

String inboxThreadSubtitle(Map<String, dynamic> item) {
  final email = item['founderEmail'];
  final detail = '${item['categoryLabel']} · ${item['statusLabel']}';
  if (email is String && email.isNotEmpty) return '$email · $detail';
  return detail;
}

/// Founders never see internal notes. The owner inbox still does.
List<Map<String, dynamic>> founderVisibleMessages(Object? messages) {
  if (messages is! List) return const [];
  return messages
      .whereType<Map>()
      .map((row) => Map<String, dynamic>.from(row))
      .where((row) => row['kind'] != 'internal_note')
      .toList();
}

/// Header control on the owner people screen.
class MessageFounderButton extends StatelessWidget {
  const MessageFounderButton({
    super.key,
    required this.isOwner,
    required this.founders,
    required this.onPressed,
  });

  final bool isOwner;
  final List<MessageableFounder> founders;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    if (!showStartThreadControl(isOwner: isOwner, founders: founders)) {
      return const SizedBox.shrink();
    }
    return FilledButton(
      onPressed: onPressed,
      child: const Text('Message founder'),
    );
  }
}

/// Subject, message, and an optional founder picker. Used by the people screen.
class OwnerMessageForm extends StatefulWidget {
  const OwnerMessageForm({
    super.key,
    required this.founders,
    required this.onSubmit,
    this.recipientUserId,
  });

  final List<MessageableFounder> founders;
  final String? recipientUserId;
  final Future<void> Function(OwnerThreadDraft draft) onSubmit;

  @override
  State<OwnerMessageForm> createState() => _OwnerMessageFormState();
}

class _OwnerMessageFormState extends State<OwnerMessageForm> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String? _recipient;
  String? _error;
  bool _busy = false;

  bool get _locked =>
      widget.recipientUserId != null && widget.recipientUserId!.isNotEmpty;

  bool get _canCompose => _locked || widget.founders.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _recipient =
        widget.recipientUserId ??
        (widget.founders.isNotEmpty ? widget.founders.first.userId : null);
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    final parsed = parseOwnerThread(
      recipientUserId: _recipient,
      title: _title.text,
      body: _body.text,
    );
    if (parsed.draft == null) {
      setState(() => _error = parsed.error);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(parsed.draft!);
    } catch (error) {
      if (mounted) setState(() => _error = _readable(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _readable(Object error) {
    const prefix = 'Exception: ';
    final text = error.toString();
    if (text.startsWith(prefix)) return text.substring(prefix.length);
    return text;
  }

  String? get _lockedLabel {
    final id = widget.recipientUserId;
    for (final person in widget.founders) {
      if (person.userId == id) return person.label;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_canCompose)
          const Text('No founding members with open access.')
        else ...[
          if (!_locked)
            DropdownButton<String>(
              key: const Key('owner-message-founder'),
              isExpanded: true,
              value: _recipient,
              items: [
                for (final person in widget.founders)
                  DropdownMenuItem(
                    value: person.userId,
                    child: Text(person.label),
                  ),
              ],
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _recipient = value),
            )
          else if (_lockedLabel != null)
            Text(_lockedLabel!),
          const SizedBox(height: 8),
          TextField(
            key: const Key('owner-message-subject'),
            controller: _title,
            maxLength: 120,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Subject',
              counterText: '',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('owner-message-body'),
            controller: _body,
            minLines: 3,
            maxLines: 6,
            maxLength: 4000,
            decoration: const InputDecoration(
              labelText: 'Message',
              counterText: '',
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: DayPilotColors.error)),
        ],
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(
              onPressed: _busy ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            if (_canCompose) ...[
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? 'Sending…' : 'Send'),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

Future<String?> showOwnerMessageDialog({
  required BuildContext context,
  required List<MessageableFounder> founders,
  required Future<String?> Function(OwnerThreadDraft draft) onSubmit,
  String? recipientUserId,
}) {
  return showDialog<String>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: const Text('New message'),
        content: SingleChildScrollView(
          child: OwnerMessageForm(
            founders: founders,
            recipientUserId: recipientUserId,
            onSubmit: (draft) async {
              final id = await onSubmit(draft);
              if (!dialogContext.mounted) return;
              Navigator.pop(
                dialogContext,
                id == null || id.isEmpty ? null : id,
              );
            },
          ),
        ),
      );
    },
  );
}
