// Short "What is this?" explanations, written for a BTech viva.
export const GLOSSARY = {
  preprocessing: ['Data preprocessing', 'Preparing raw data by handling missing values, duplicates and inconsistent records so that algorithms can learn from it.'],
  classification: ['Classification', 'Assigning a data record to one of several predefined categories - here Excellent, Good, Average or Poor.'],
  decision_tree: ['Decision tree', 'A tree-based model that makes decisions using feature-based conditions. It classifies records by repeatedly splitting the data using the most useful attribute.'],
  naive_bayes: ['Naive Bayes', "A probabilistic classifier based on Bayes' theorem. It assumes attributes are independent, which is 'naive' but works surprisingly well."],
  knn: ['K-Nearest Neighbors', 'A classifier that predicts a record based on nearby training examples: the majority class among the K most similar students wins.'],
  random_forest: ['Random Forest', 'Many decision trees trained on random parts of the data vote together. Voting reduces the errors of any single tree.'],
  confusion: ['Confusion matrix', 'A table showing correct and incorrect predictions for each class. Rows are the real class, columns are the predicted class.'],
  cv: ['Cross validation', 'A technique used to estimate how well a model generalizes to unseen data. The data is split into folds; each fold takes a turn as the test set.'],
  split: ['Train/test split', 'Part of the data (training set) is used to learn; the unseen remainder (test set) is used to measure how well the model works on new students.'],
  metrics: ['Accuracy, precision, recall, F1', 'Accuracy = correct predictions / all predictions. Precision = of those predicted as a class, how many were right. Recall = of the real members of a class, how many were found. F1 = balance of precision and recall.'],
  correlation: ['Correlation', 'A number between -1 and +1 showing how strongly two attributes move together. It never proves that one causes the other.'],
  feature_selection: ['Feature selection', 'Choosing the attributes that carry the most information about the class. Mutual information measures how much knowing an attribute reduces uncertainty about Performance.'],
  importance: ['Feature importance', 'How much the model accuracy drops when one attribute is shuffled. A big drop means the model relies on that attribute.'],
}
