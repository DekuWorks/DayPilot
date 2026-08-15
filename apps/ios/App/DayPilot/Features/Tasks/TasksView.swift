import SwiftUI

struct TasksView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView(
                "Tasks stay on web / Flutter this slice",
                systemImage: "checkmark.circle",
                description: Text("Same Supabase tasks table. This screen is a shell until calendar + sync are solid.")
            )
            .navigationTitle("Tasks")
        }
    }
}
