# Viva Questions and Easy Answers

**1. What is data mining?**
Finding useful patterns in large amounts of data, e.g. which habits go with good marks.

**2. What is the aim of your project?**
To predict a student's performance class (Excellent/Good/Average/Poor) from attendance, marks and study habits, and to show the whole data-mining workflow on a website.

**3. What is classification?**
Assigning a record to one of several predefined classes using patterns learned from labelled examples.

**4. Which attribute is the class (target) attribute?**
`Performance`.

**5. Why is Student_ID not used as a feature?**
It is just a label for the student and has no relation to performance; using it could make a model memorise students instead of learning patterns.

**6. What is data preprocessing and why is it needed?**
Cleaning and preparing raw data (missing values, duplicates, wrong values) because models give poor or unreliable results on dirty data.

**7. How did you handle missing values?**
By default with the median for numbers and the most frequent value for categories. The user can also choose mean, drop rows, or do nothing.

**8. Why median instead of mean?**
The median is not pulled by extreme values, so it is a safer "typical" value.

**9. Why remove duplicates?**
A duplicated student counts twice, biasing the model, and a copy can land in both training and test sets, making accuracy look better than it is.

**10. What are "impossible values" in your data?**
Typing errors such as attendance 130%, negative marks, or 30 study hours a day. They are set to missing and then filled.

**11. What is feature selection?**
Choosing attributes that carry the most information about the class. I rank attributes by mutual information with Performance.

**12. What is a decision tree?**
A tree-based model that classifies by asking attribute-based questions step by step until it reaches a class at a leaf.

**13. What is J48?**
WEKA's implementation of the C4.5 decision-tree algorithm.

**14. Is your tree the same as WEKA's J48?**
No. I use scikit-learn's `DecisionTreeClassifier` configured with entropy (information gain), a minimum leaf size and a depth limit. It follows the same idea but is CART-style and binary, so results can differ.

**15. What are entropy and information gain?**
Entropy measures how mixed the classes are in a node. Information gain is the drop in entropy after a split. The tree picks the split with the highest gain.

**16. What is over-fitting and how do you reduce it?**
When a model memorises training data and fails on new data. I limit tree depth and require at least 10 students per leaf (like pruning).

**17. How does Naive Bayes work?**
It uses Bayes' theorem to compute the probability of each class given the attributes, assuming attributes are independent.

**18. Why is it called "naive"?**
Because the independence assumption is rarely true in real data, yet the method often works well.

**19. How does KNN work?**
It finds the K most similar training students (K = 7 here) and predicts the majority class among them.

**20. Why did you scale data for KNN?**
KNN uses distances; without scaling, attributes with large numbers (e.g. marks) would dominate small ones (e.g. study hours).

**21. Why not scale for the decision tree?**
Trees ask threshold questions per attribute and are unaffected by scale, and unscaled thresholds stay readable ("Attendance > 74.5").

**22. What is Random Forest?**
Many decision trees trained on random parts of the data whose votes are combined for a more stable prediction.

**23. What is a train/test split?**
Dividing data into a training part for learning and an unseen test part for measuring performance. I offer 80/20 and 70/30.

**24. What does "stratified" mean?**
Each class appears in the same proportion in both the train and test parts.

**25. What is cross-validation?**
The data is divided into k folds; each fold is the test set once while the model trains on the rest; the scores are averaged. I use 10 folds by default.

**26. Why cross-validation if you already have a test set?**
One split may be lucky or unlucky. Averaging over folds gives a more reliable estimate.

**27. What is a confusion matrix?**
A table of actual vs predicted classes. Diagonal cells are correct predictions; others show mistakes.

**28. Explain TP, FP, FN, TN.**
For a chosen class: TP = real members predicted correctly; FP = non-members wrongly predicted as the class; FN = real members the model missed; TN = non-members correctly left out.

**29. What is accuracy? When can it mislead?**
Correct predictions ÷ total. It can mislead when one class is much bigger than others, so I also report precision, recall and F1.

**30. Define precision and recall.**
Precision = TP / (TP + FP): of those predicted as a class, how many were right. Recall = TP / (TP + FN): of real members, how many were found.

**31. What is the F1 score?**
The harmonic mean of precision and recall - high only when both are high.

**32. Why is your accuracy not 100%?**
The data contains realistic noise and overlapping classes (e.g. Good vs Average students look similar). Perfect accuracy would suggest fake or leaked data.

**33. Which model was best and why?**
Usually Random Forest, then Naive Bayes and KNN, with a single shallow tree last - it is computed live, so check the Comparison page. A forest averages many trees, but a single tree gives readable rules.

**34. Why still use a decision tree if it is less accurate?**
Interpretability: the rules can be read and explained to teachers, and it matches the J48 case study.

**35. How is "confidence" calculated?**
It is the model's probability for the predicted class (e.g. 68%). It is not a guarantee.

**36. How do you explain a single prediction?**
Each input is replaced by the dataset's typical value, one at a time, and I see how much the model's confidence in the predicted class changes. A big drop means that input supported the prediction.

**37. Does this prove study hours cause better marks?**
No. Correlation does not imply causation; other factors such as motivation may drive both.

**38. Is the dataset real?**
No, it is synthetic, generated with sensible relationships and noise by `generate_dataset.py`. Real data would need anonymisation and consent.

**39. What are the ethical concerns?**
Predictions can be wrong or biased, labels can stigmatise students, and data is private. So the app calls them decision support, uses temporary groups instead of permanent labels, and requires human review.

**40. What happens when a user uploads a CSV?**
The backend validates it (needs Performance and numeric columns, enough rows), replaces the dataset, and all pages recompute from it. Bad files get a clear error message.

**41. Which technologies did you use and why?**
React/Vite/Tailwind/Recharts for a modern UI; Flask for a simple REST API; pandas and scikit-learn for data handling and machine learning; all free and local.

**42. How does the frontend talk to the backend?**
Through JSON REST APIs such as `POST /api/train` and `POST /api/predict`; Vite proxies `/api` to Flask.

**43. What is a scikit-learn Pipeline and why use it?**
A chain of steps (impute → encode → classify). It keeps preprocessing inside cross-validation so no information leaks from test folds into training.

**44. What is one-hot encoding?**
Turning a text category (Low/Medium/High) into separate 0/1 columns so numeric algorithms can use it.

**45. What are the main limitations and future scope?**
Synthetic data, in-memory state, accuracy limited by noise. Future: real anonymised data, tuning, SHAP, trend tracking, database, reports.
