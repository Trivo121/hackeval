import csv
from grpo import frontend

def export_leaderboard():
    leaderboard = frontend.leaderboard.get_leaderboard()
    with open('leaderboard.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['rank', 'team', 'project title', 'matched problem track', 'match confidence', 'score'])
        for rank, team, project_title, matched_track, match_confidence, score in leaderboard:
            writer.writerow([rank, team, project_title, matched_track, match_confidence, score])

def export_feedback():
    feedback = frontend.leaderboard.get_feedback()
    with open('feedback.pdf', 'wb') as file:
        feedback_bytes = b''.join([f'{k} {v}\n' for k, v in feedback.items()])
        file.write(feedback_bytes)

# Example usage
export_leaderboard()
export_feedback()
