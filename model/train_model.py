import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load dataset
df = pd.read_csv("focusguard_app_usage_realistic.csv")

# Combine 'app_name' and 'window_title' as text input features
df['text'] = df['app_name'] + " " + df['window_title']

X = df['text']
y = df['category']

# Split into train and test sets (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build a pipeline with TF-IDF vectorizer and Logistic Regression classifier
model = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', LogisticRegression(max_iter=1000))
])

# Train the model
model.fit(X_train, y_train)

# Test the model
y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# Save the trained model for later use
joblib.dump(model, "focusguard_model.pkl")
print("Model saved to focusguard_model.pkl")
