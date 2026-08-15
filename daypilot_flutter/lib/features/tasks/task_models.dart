import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

enum TaskFilter { all, today, upcoming, completed }

class TaskRow {
  const TaskRow({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.dueAt,
    this.description,
    this.projectId,
  });

  final String id;
  final String title;
  final String status;
  final String priority;
  final DateTime? dueAt;
  final String? description;
  final String? projectId;

  bool get isDone => status == 'completed';
}

class SubtaskRow {
  const SubtaskRow({
    required this.id,
    required this.taskId,
    required this.title,
    required this.status,
    required this.position,
  });

  final String id;
  final String taskId;
  final String title;
  final String status;
  final int position;

  bool get isDone => status == 'completed';
}

class TaskProject {
  const TaskProject({
    required this.id,
    required this.name,
    required this.color,
  });

  final String id;
  final String name;
  final String color;
}

class PriorityDot extends StatelessWidget {
  const PriorityDot({super.key, required this.priority});

  final String priority;

  @override
  Widget build(BuildContext context) {
    final color = switch (priority) {
      'urgent' => DayPilotColors.error,
      'high' => DayPilotColors.warning,
      'low' => DayPilotScheme.of(context).textTertiary,
      _ => DayPilotScheme.of(context).textSecondary,
    };
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
