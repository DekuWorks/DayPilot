import 'package:daypilot_flutter/features/founder_hub/founder_owner_message.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const ada = {
    'userId': 'ada',
    'name': 'Ada Lovelace',
    'email': 'ada@example.com',
    'canMessage': true,
    'founderNumber': 1,
  };
  const grace = {
    'userId': 'grace',
    'name': '  ',
    'email': 'grace@example.com',
    'canMessage': true,
    'founderNumber': 2,
  };

  test('only open founding members can be messaged', () {
    final people = messageableFounders([
      ada,
      grace,
      {
        'userId': 'expired',
        'name': 'Expired',
        'canMessage': false,
        'founderNumber': 3,
      },
      {'name': 'Unlinked', 'canMessage': true, 'founderNumber': 4},
      {'userId': '  ', 'name': 'Blank', 'canMessage': true},
      {'userId': 'pro', 'email': 'pro@example.com', 'canMessage': false},
    ]);

    expect(people.map((person) => person.userId).toList(), ['ada', 'grace']);
    expect(people.map((person) => person.label).toList(), [
      'Ada Lovelace',
      'grace@example.com',
    ]);
    expect(founderDisplayLabel({'founderNumber': 7}), 'Founder 07');
    expect(messageableFounders(const []), isEmpty);
  });

  test(
    'the start control is hidden unless the owner has someone to message',
    () {
      final founders = messageableFounders([ada]);
      expect(showStartThreadControl(isOwner: true, founders: founders), isTrue);
      expect(
        showStartThreadControl(isOwner: false, founders: founders),
        isFalse,
      );
      expect(
        showStartThreadControl(isOwner: true, founders: const []),
        isFalse,
      );
    },
  );

  test('a thread needs a founder, a subject, and a message', () {
    final ready = parseOwnerThread(
      recipientUserId: ' ada ',
      title: '  Week view  ',
      body: ' Can you try it? ',
    );
    expect(ready.error, isNull);
    expect(ready.draft?.recipientUserId, 'ada');
    expect(ready.draft?.title, 'Week view');
    expect(ready.draft?.body, 'Can you try it?');

    expect(
      parseOwnerThread(recipientUserId: '', title: 'Hi', body: 'There').error,
      'Choose a founding member.',
    );
    expect(
      parseOwnerThread(
        recipientUserId: 'ada',
        title: '   ',
        body: 'There',
      ).error,
      'Subject must be 1–120 characters.',
    );
    expect(
      parseOwnerThread(
        recipientUserId: 'ada',
        title: 'a' * 121,
        body: 'There',
      ).error,
      'Subject must be 1–120 characters.',
    );
    expect(
      parseOwnerThread(recipientUserId: 'ada', title: 'Hi', body: '').error,
      'Message must be 1–4000 characters.',
    );
    expect(
      parseOwnerThread(
        recipientUserId: 'ada',
        title: 'Hi',
        body: 'm' * 4001,
      ).error,
      'Message must be 1–4000 characters.',
    );
  });

  test('a founder cannot read another founder’s thread', () {
    final adaThread = {'id': 't-ada', 'founderUserId': 'ada', 'title': 'Hello'};
    final ownView = {'id': 't-own', 'title': 'From DayPilot'};

    expect(
      canReadFounderThread(
        thread: adaThread,
        viewerUserId: 'grace',
        isOwner: false,
      ),
      isFalse,
    );
    expect(
      canReadFounderThread(
        thread: adaThread,
        viewerUserId: 'ada',
        isOwner: false,
      ),
      isTrue,
    );
    expect(
      canReadFounderThread(
        thread: adaThread,
        viewerUserId: 'grace',
        isOwner: true,
      ),
      isTrue,
    );
    expect(
      canReadFounderThread(
        thread: ownView,
        viewerUserId: 'ada',
        isOwner: false,
      ),
      isTrue,
    );
    expect(
      threadsForFounderHub([
        adaThread,
        {'id': 't-grace', 'founderUserId': 'grace', 'title': 'Other'},
        ownView,
      ], viewerUserId: 'ada').map((row) => row['id']),
      ['t-ada', 't-own'],
    );
  });

  test('the founder hub labels an owner message and hides internal notes', () {
    final message = {
      'id': 't1',
      'title': 'Week view',
      'categoryLabel': 'Other',
      'statusLabel': 'Submitted',
      'messages': [
        {'kind': 'admin_reply', 'body': 'Can you try the week view?'},
        {'kind': 'internal_note', 'body': 'Do not show this.'},
      ],
    };
    expect(isOwnerStartedThread(message), isTrue);
    expect(hubThreadSubtitle(message), 'Message from DayPilot · Submitted');
    expect(
      founderVisibleMessages(message['messages']).map((row) => row['body']),
      ['Can you try the week view?'],
    );

    final suggestion = {
      'categoryLabel': 'Bug',
      'statusLabel': 'Submitted',
      'messages': [
        {'kind': 'founder', 'body': 'The grid is cramped.'},
        {'kind': 'admin_reply', 'body': 'Thanks.'},
      ],
    };
    expect(isOwnerStartedThread(suggestion), isFalse);
    expect(hubThreadSubtitle(suggestion), 'Bug · Submitted');
  });

  test('the owner inbox shows who the thread is for', () {
    final thread = {
      'title': 'Week view',
      'ownerUnread': false,
      'founderEmail': 'ada@example.com',
      'categoryLabel': 'Other',
      'statusLabel': 'Submitted',
    };
    expect(inboxThreadTitle(thread), 'Week view');
    expect(inboxThreadSubtitle(thread), 'ada@example.com · Other · Submitted');
    expect(
      inboxThreadTitle({...thread, 'ownerUnread': true}),
      'Week view · unread',
    );
  });

  testWidgets('Message founder is hidden unless the viewer is the owner', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              MessageFounderButton(
                isOwner: false,
                founders: const [
                  MessageableFounder(userId: 'ada', label: 'Ada'),
                ],
                onPressed: () {},
              ),
              MessageFounderButton(
                isOwner: true,
                founders: const [],
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Message founder'), findsNothing);

    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MessageFounderButton(
            isOwner: true,
            founders: const [MessageableFounder(userId: 'ada', label: 'Ada')],
            onPressed: () => taps++,
          ),
        ),
      ),
    );
    expect(find.text('Message founder'), findsOneWidget);
    await tester.tap(find.text('Message founder'));
    expect(taps, 1);
  });

  testWidgets('the owner picks a founder, subject, and message', (
    tester,
  ) async {
    OwnerThreadDraft? sent;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return Scaffold(
              body: FilledButton(
                onPressed: () {
                  showOwnerMessageDialog(
                    context: context,
                    founders: const [
                      MessageableFounder(userId: 'ada', label: 'Ada Lovelace'),
                      MessageableFounder(
                        userId: 'grace',
                        label: 'Grace Hopper',
                      ),
                    ],
                    onSubmit: (draft) async {
                      sent = draft;
                      return 'thread-9';
                    },
                  );
                },
                child: const Text('Open'),
              ),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('New message'), findsOneWidget);

    await tester.tap(find.byKey(const Key('owner-message-founder')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Grace Hopper').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('owner-message-subject')),
      '  Week view  ',
    );
    await tester.enterText(
      find.byKey(const Key('owner-message-body')),
      ' Can you try it? ',
    );
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();

    expect(sent?.recipientUserId, 'grace');
    expect(sent?.title, 'Week view');
    expect(sent?.body, 'Can you try it?');
    expect(find.text('New message'), findsNothing);
  });

  testWidgets('send stays closed when the subject is empty', (tester) async {
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return Scaffold(
              body: FilledButton(
                onPressed: () {
                  showOwnerMessageDialog(
                    context: context,
                    founders: const [
                      MessageableFounder(userId: 'ada', label: 'Ada'),
                    ],
                    recipientUserId: 'ada',
                    onSubmit: (draft) async {
                      calls++;
                      return 'thread-1';
                    },
                  );
                },
                child: const Text('Open'),
              ),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('owner-message-founder')), findsNothing);
    expect(find.text('Ada'), findsOneWidget);
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    expect(find.text('Subject must be 1–120 characters.'), findsOneWidget);
    expect(calls, 0);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(calls, 0);
    expect(find.text('New message'), findsNothing);
  });

  testWidgets('an empty founder list cannot send', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: OwnerMessageForm(founders: [], onSubmit: _unusedSubmit),
        ),
      ),
    );
    expect(find.text('No founding members with open access.'), findsOneWidget);
    expect(find.text('Send'), findsNothing);
  });

  test('a sent thread is inserted at the top of the inbox', () {
    final existing = {
      'id': 'old',
      'title': 'Older',
      'categoryLabel': 'Bug',
      'statusLabel': 'Submitted',
    };
    final sent = {
      'id': 'thread-9',
      'title': 'Week view',
      'founderEmail': 'ada@example.com',
      'categoryLabel': 'Other',
      'statusLabel': 'Submitted',
    };
    expect(prependInboxThread([existing], sent).map((row) => row['id']), [
      'thread-9',
      'old',
    ]);
    expect(prependInboxThread([sent, existing], sent).map((row) => row['id']), [
      'thread-9',
      'old',
    ]);
    expect(prependInboxThread([existing], {'title': 'No id'}), [existing]);
  });

  testWidgets('the empty founder inbox lets the owner start a message', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: FounderInboxMessages(
            isOwner: false,
            items: const [],
            onMessage: () {},
            onOpen: (_) {},
          ),
        ),
      ),
    );
    expect(find.text('No founder messages.'), findsOneWidget);
    expect(find.text('Message founder'), findsNothing);

    var items = <Map<String, dynamic>>[];
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return Scaffold(
              body: FounderInboxMessages(
                isOwner: true,
                items: items,
                onOpen: (_) {},
                onMessage: () {
                  showOwnerMessageDialog(
                    context: context,
                    founders: const [
                      MessageableFounder(userId: 'ada', label: 'Ada Lovelace'),
                    ],
                    onSubmit: (draft) async {
                      setState(() {
                        items = prependInboxThread(items, {
                          'id': 'thread-9',
                          'title': draft.title,
                          'ownerUnread': false,
                          'founderEmail': 'ada@example.com',
                          'categoryLabel': 'Other',
                          'statusLabel': 'Submitted',
                        });
                      });
                      return 'thread-9';
                    },
                  );
                },
              ),
            );
          },
        ),
      ),
    );

    expect(find.text('No founder messages.'), findsOneWidget);
    expect(find.text('Message founder'), findsOneWidget);
    await tester.tap(find.text('Message founder'));
    await tester.pumpAndSettle();
    expect(find.text('New message'), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('owner-message-subject')),
      'Week view',
    );
    await tester.enterText(
      find.byKey(const Key('owner-message-body')),
      'Can you try it?',
    );
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();

    expect(find.text('No founder messages.'), findsNothing);
    expect(find.text('Week view'), findsOneWidget);
    expect(find.text('ada@example.com · Other · Submitted'), findsOneWidget);
    expect(find.text('Message founder'), findsOneWidget);
  });

  testWidgets('Message founder stays on the inbox when threads exist', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: FounderInboxMessages(
            isOwner: true,
            items: const [
              {
                'id': 'old',
                'title': 'Older note',
                'founderEmail': 'ada@example.com',
                'categoryLabel': 'Bug',
                'statusLabel': 'Submitted',
              },
            ],
            onMessage: () {},
            onOpen: (_) {},
          ),
        ),
      ),
    );
    expect(find.text('Message founder'), findsOneWidget);
    expect(find.text('No founder messages.'), findsNothing);
    expect(find.text('Older note'), findsOneWidget);
  });
}

Future<void> _unusedSubmit(OwnerThreadDraft draft) async {}
