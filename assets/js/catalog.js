/* Book structure (AIMA 4th US edition, with Global Edition numbers) and verified links to real exam papers. */
(function (G) {
  'use strict';
  const AI = G.AI;
  AI.parts = [
    { n: 1, title: 'Artificial Intelligence', c: 'p1', blurb: 'What AI is, and the agent view that organises the whole book.' },
    { n: 2, title: 'Problem-solving', c: 'p2', blurb: 'Search: from route-finding to games and constraint puzzles.' },
    { n: 3, title: 'Knowledge, reasoning, and planning', c: 'p3', blurb: 'Logic as a language for agents, and how to plan with it.' },
    { n: 4, title: 'Uncertain knowledge and reasoning', c: 'p4', blurb: 'Probability, Bayesian networks, decisions and multiple agents.' },
    { n: 5, title: 'Machine Learning', c: 'p5', blurb: 'Learning from examples, probabilistic models, deep and reinforcement learning.' },
    { n: 6, title: 'Communicating, perceiving, and acting', c: 'p6', blurb: 'Language, vision and robots.' },
    { n: 7, title: 'Conclusions', c: 'p7', blurb: 'Philosophy, ethics, safety and where AI is going.' }
  ];

  // Verified sources (each URL checked during preparation).
  const MIT = 'https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/';
  const S = {
    mitQ1: { t: 'MIT 6.034 Quiz 1, Fall 2010', u: MIT + '375a359db7e33c1ffab2f399e40e09ae_MIT6_034F10_quiz1_2010.pdf', s: 'MIT OpenCourseWare' },
    mitQ2: { t: 'MIT 6.034 Quiz 2, Fall 2010', u: MIT + 'c8a902eca585e29a8d9744f7d3fff95f_MIT6_034F10_quiz2_2010.pdf', s: 'MIT OpenCourseWare' },
    mitQ3_08: { t: 'MIT 6.034 Quiz 3, 2008', u: MIT + 'bd67a9fc7d5fd4caf676e7af65d4ad44_MIT6_034F10_quiz3_2008.pdf', s: 'MIT OpenCourseWare' },
    mitQ3_09: { t: 'MIT 6.034 Quiz 3, 2009', u: MIT + '230c5c58cf4928991b9e4a76408433d9_MIT6_034F10_quiz3_2009.pdf', s: 'MIT OpenCourseWare' },
    mitQ4_08: { t: 'MIT 6.034 Quiz 4, 2008', u: MIT + 'b0d5ec844c188de34ba938365c875711_MIT6_034F10_quiz4_2008.pdf', s: 'MIT OpenCourseWare' },
    mitQ4_10: { t: 'MIT 6.034 Quiz 4, Fall 2010', u: MIT + '4fdd5e37a8b58cdd2e30f5c3ec4f47f8_MIT6_034F10_quiz4_2010.pdf', s: 'MIT OpenCourseWare' },
    mitF10: { t: 'MIT 6.034 Final, 2010', u: MIT + 'a2500cfe75836c4f578899e9170bc8a1_MIT6_034F10_final_2010.pdf', s: 'MIT OpenCourseWare' },
    mitF09: { t: 'MIT 6.034 Final, 2009', u: MIT + 'd75968db1829da437fc05787a17ba614_MIT6_034F10_final_2009.pdf', s: 'MIT OpenCourseWare' },
    mitF08: { t: 'MIT 6.034 Final, 2008', u: MIT + 'd35136ea4229232d216b079e2a29e569_MIT6_034F10_final_2008.pdf', s: 'MIT OpenCourseWare' },
    mitF07: { t: 'MIT 6.034 Final, 2007', u: MIT + 'c397cd7083422b1f3d1c6d86d1b9e327_MIT6_034F10_final_2007.pdf', s: 'MIT OpenCourseWare' },
    mitSp: { t: 'MIT 6.034 (spring) past midterms and finals with solutions', u: 'https://courses.csail.mit.edu/6.034s/resources.html', s: 'MIT CSAIL' },
    mitRev: { t: 'MIT 6.034 Quiz 1 review, with solutions', u: 'https://courses.csail.mit.edu/6.034s/07/handouts/quiz1-review-sol.pdf', s: 'MIT CSAIL' },
    bk: { t: 'Berkeley CS188 past exams (2011–2014), with solutions', u: 'https://ai.berkeley.edu/exams.html', s: 'UC Berkeley' },
    bkR: { t: 'CS188 past exams page from Stuart Russell’s Fall 2014 course', u: 'https://people.eecs.berkeley.edu/~russell/classes/cs188/f14/exams.html', s: 'UC Berkeley' },
    bkHKN: { t: 'CS188 exam archive (2016–2020)', u: 'https://hkn.eecs.berkeley.edu/exams/course/cs/188', s: 'Berkeley HKN' },
    bkFa25m: { t: 'CS188 Fall 2025 Midterm', u: 'https://inst.eecs.berkeley.edu/~cs188/assets/exam/cs188-fa25-midterm.pdf', s: 'UC Berkeley' },
    bkFa25ms: { t: 'CS188 Fall 2025 Midterm solutions', u: 'https://inst.eecs.berkeley.edu/~cs188/assets/exam/cs188-fa25-midterm-solutions.pdf', s: 'UC Berkeley' },
    bkFa25f: { t: 'CS188 Fall 2025 Final solutions', u: 'https://inst.eecs.berkeley.edu/~cs188/assets/exam/cs188-fa25-final-solutions.pdf', s: 'UC Berkeley' },
    bkSp25f: { t: 'CS188 Spring 2025 Final solutions', u: 'https://inst.eecs.berkeley.edu/~cs188/assets/exam/cs188-sp25-final-solutions.pdf', s: 'UC Berkeley' },
    bkSu25f: { t: 'CS188 Summer 2025 Final solutions', u: 'https://inst.eecs.berkeley.edu/~cs188/assets/exam/cs188-su25-final-solutions.pdf', s: 'UC Berkeley' },
    bkFa22f: { t: 'CS188 Fall 2022 Final solutions (all multiple choice)', u: 'https://inst.eecs.berkeley.edu/~cs188/fa22/assets/exam/cs188-fa22-final-solutions.pdf', s: 'UC Berkeley' },
    cs0: { t: 'CS50 AI Quiz 0: Search', u: 'https://cs50.harvard.edu/ai/quizzes/0/', s: 'Harvard CS50' },
    cs1: { t: 'CS50 AI Quiz 1: Knowledge', u: 'https://cs50.harvard.edu/ai/quizzes/1', s: 'Harvard CS50' },
    cs2: { t: 'CS50 AI Quiz 2: Uncertainty', u: 'https://cs50.harvard.edu/ai/quizzes/2', s: 'Harvard CS50' },
    cs3: { t: 'CS50 AI Quiz 3: Optimization', u: 'https://cs50.harvard.edu/ai/quizzes/3', s: 'Harvard CS50' },
    cs4: { t: 'CS50 AI Quiz 4: Learning', u: 'https://cs50.harvard.edu/summer/ai/2020/quizzes/4/', s: 'Harvard CS50' },
    cs5: { t: 'CS50 AI Quiz 5: Neural networks', u: 'https://cs50.harvard.edu/ai/quizzes/5', s: 'Harvard CS50' },
    cs6: { t: 'CS50 AI Quiz 6: Language', u: 'https://cs50.harvard.edu/ai/quizzes/6', s: 'Harvard CS50' },
    csN3: { t: 'CS50 AI Lecture 3 notes: Optimization (includes constraint satisfaction)', u: 'https://cs50.harvard.edu/ai/notes/3/', s: 'Harvard CS50' },
    csKn: { t: 'CS50 AI project: Knights (knights-and-knaves puzzles by model checking)', u: 'https://cs50.harvard.edu/ai/projects/1/knights/', s: 'Harvard CS50' },
    cmuBN: { t: 'CMU 15-281 course notes: Bayes nets and d-separation', u: 'https://www.cs.cmu.edu/~15281/coursenotes/bayesnets/', s: 'Carnegie Mellon' },
    cmuR10: { t: 'CMU 15-281 Recitation 10: Bayes nets', u: 'https://www.cs.cmu.edu/~15281-f25/recitations/rec10/rec10.pdf', s: 'Carnegie Mellon' },
    cmuR10s: { t: 'CMU 15-281 Recitation 10 solutions', u: 'https://www.cs.cmu.edu/~15281-s25/recitations/rec10/rec10_sol.pdf', s: 'Carnegie Mellon' }
  };
  const X = slug => ({ t: 'AIMA online exercises for this topic', u: `https://aimacode.github.io/aima-exercises/${slug}/`, s: 'aimacode (official exercise site)' });
  AI.sources = S;

  // papers: [sourceKey, what to look at]
  AI.chapters = [
    { n: 1, part: 1, g: 1, title: 'Introduction', blurb: 'Four ways to define AI, the fields it draws on, and a short history.',
      papers: [], ex: [X('intro-exercises')] },
    { n: 2, part: 1, g: 2, title: 'Intelligent Agents', blurb: 'Agents, rationality, task environments (PEAS) and the main agent designs.',
      papers: [], ex: [X('agents-exercises')] },
    { n: 3, part: 2, g: 3, title: 'Solving Problems by Searching', blurb: 'Problem formulation, uninformed search, and heuristic search with A*.',
      papers: [['mitQ1', 'Problem 2 is a search problem'], ['mitF09', 'Quiz 1 part includes a search problem'], ['mitF08', 'Optimal search: branch and bound with an extended list'], ['mitF10', 'Search on a graph with heuristic estimates'], ['bk', 'Midterm 1 papers cover search'], ['bkSu25f', 'Opens with DFS, BFS and UCS on a puzzle'], ['bkSp25f', 'Question 1 is about search'], ['cs0', 'DFS vs BFS, greedy vs A*']],
      ex: [X('search-exercises')] },
    { n: 4, part: 2, g: 4, title: 'Search in Complex Environments', blurb: 'Local search and optimisation, nondeterminism, partial observability and online search.',
      papers: [['cs3', 'Hill-climbing variants and optimisation']], ex: [X('advanced-search-exercises')] },
    { n: 5, part: 2, g: 6, title: 'Adversarial Search and Games', blurb: 'Minimax, alpha–beta pruning, evaluation functions, Monte Carlo tree search and chance.',
      papers: [['mitF09', 'Game tree with alpha–beta values'], ['mitF08', 'A minimax game-tree problem'], ['bk', 'Midterm 1 papers cover games'], ['cs0', 'Minimax questions']], ex: [X('game-playing-exercises')] },
    { n: 6, part: 2, g: 5, title: 'Constraint Satisfaction Problems', blurb: 'Variables, domains and constraints; propagation, backtracking and local search.',
      papers: [['mitQ2', 'Part A sets up and solves a constraint problem'], ['mitF07', 'A cryptarithmetic puzzle as a CSP'], ['mitF08', 'An assignment problem solved as a CSP'], ['bkFa25m', 'A train-scheduling CSP'], ['bkFa25ms', 'Solutions to the same paper'], ['bk', 'Midterm 1 papers cover CSPs'], ['csN3', 'Backtracking search and arc consistency']], ex: [X('csp-exercises')] },
    { n: 7, part: 3, g: 7, title: 'Logical Agents', blurb: 'Propositional logic, entailment, model checking, resolution and chaining.',
      papers: [['cs1', 'Entailment and logical equivalence'], ['csKn', 'Encode puzzles as a knowledge base'], ['mitQ1', 'Problem 1: rule-based system with backward chaining'], ['mitF09', 'Forward chaining with rules']], ex: [X('knowledge-logic-exercises')] },
    { n: 8, part: 3, g: 8, title: 'First-Order Logic', blurb: 'Objects, relations, quantifiers, and writing knowledge in first-order logic.',
      papers: [['cs1', 'Includes a first-order translation question']], ex: [X('fol-exercises')] },
    { n: 9, part: 3, g: 9, title: 'Inference in First-Order Logic', blurb: 'Unification, forward and backward chaining, and resolution with variables.',
      papers: [['mitF09', 'Rules with variables, chained forward'], ['mitQ1', 'Backward chaining goal tree']], ex: [X('logical-inference-exercises')] },
    { n: 10, part: 3, g: 10, title: 'Knowledge Representation', blurb: 'Ontologies, categories, events and time, mental objects and default reasoning.',
      papers: [], ex: [X('kr-exercises')] },
    { n: 11, part: 3, g: 11, title: 'Automated Planning', blurb: 'PDDL, forward and backward planning, heuristics, hierarchy and scheduling.',
      papers: [], ex: [X('planning-exercises'), Object.assign(X('advanced-planning-exercises'), { t: 'AIMA online exercises: planning in the real world' })] },
    { n: 12, part: 4, g: 12, title: 'Quantifying Uncertainty', blurb: 'Probability, joint distributions, independence and Bayes’ rule.',
      papers: [['cs2', 'Probability questions'], ['bk', 'Midterm 2 papers cover probability']], ex: [X('probability-exercises')] },
    { n: 13, part: 4, g: 13, title: 'Probabilistic Reasoning', blurb: 'Bayesian networks: semantics, exact inference and sampling.',
      papers: [['cs2', 'A Bayesian network question'], ['bk', 'Midterm 2 papers cover Bayes nets'], ['cmuBN', 'Clear notes on d-separation'], ['cmuR10', 'Bayes net practice'], ['cmuR10s', 'Worked solutions']], ex: [X('bayes-nets-exercises')] },
    { n: 14, part: 4, g: 14, title: 'Probabilistic Reasoning over Time', blurb: 'Markov models, filtering, smoothing, HMMs, Kalman and particle filters.',
      papers: [['bk', 'Midterm 2 papers cover HMMs and particle filtering']], ex: [X('dbn-exercises')] },
    { n: 15, part: 4, g: 18, title: 'Probabilistic Programming', blurb: 'Generative programs as models, open universes, and inference by sampling.',
      papers: [], ex: [Object.assign(X('bayes-nets-exercises'), { t: 'Related AIMA exercises (Bayesian networks)' })] },
    { n: 16, part: 4, g: 15, title: 'Making Simple Decisions', blurb: 'Utility theory, decision networks and the value of information.',
      papers: [['bk', 'Midterm 1 covers utilities; Midterm 2 covers decision diagrams and VPI']], ex: [X('decision-theory-exercises')] },
    { n: 17, part: 4, g: 16, title: 'Making Complex Decisions', blurb: 'MDPs, value and policy iteration, bandits and POMDPs.',
      papers: [['bk', 'Midterm 1 papers cover MDPs']], ex: [X('complex-decisions-exercises')] },
    { n: 18, part: 4, g: 17, title: 'Multiagent Decision Making', blurb: 'Game theory, Nash equilibria, cooperation, voting and auctions.',
      papers: [], ex: [Object.assign(X('complex-decisions-exercises'), { t: 'AIMA online exercises (includes the game-theory problems)' })] },
    { n: 19, part: 5, g: 19, title: 'Learning from Examples', blurb: 'Decision trees, model selection, linear models, nearest neighbours, SVMs and ensembles.',
      papers: [['mitQ3_08', 'Nearest-neighbour decision boundaries'], ['mitRev', 'k-NN and choosing a decision-tree split'], ['mitQ4_08', 'Support vectors and AdaBoost'], ['mitQ4_10', 'SVM support-vector weights and kernels'], ['bk', 'Midterm 2: perceptrons; Final: decision trees and kernels'], ['cs4', 'Classification, regression and more']], ex: [X('concept-learning-exercises')] },
    { n: 'G20', part: 5, g: 20, global: true, title: 'Knowledge in Learning', blurb: 'Global Edition only: learning with prior knowledge, version spaces, explanation-based learning and ILP.',
      papers: [], ex: [X('ilp-exercises')] },
    { n: 20, part: 5, g: 21, title: 'Learning Probabilistic Models', blurb: 'Bayesian learning, maximum likelihood, naive Bayes and EM.',
      papers: [['bk', 'Midterm 2: naive Bayes; Final: clustering']], ex: [X('bayesian-learning-exercises')] },
    { n: 21, part: 5, g: 22, title: 'Deep Learning', blurb: 'Neural networks, backpropagation, convolutional and recurrent networks.',
      papers: [['mitQ3_09', 'Perceptrons and neural net weights'], ['cs5', 'Neural networks and max-pooling'], ['bk', 'Final papers cover neural networks']], ex: [Object.assign(X('concept-learning-exercises'), { t: 'AIMA online exercises (includes the neural network problems)' })] },
    { n: 22, part: 5, g: 23, title: 'Reinforcement Learning', blurb: 'Passive and active RL, TD learning, Q-learning and exploration.',
      papers: [['bk', 'Midterm 1 papers cover reinforcement learning'], ['cs4', 'Learning quiz (includes reinforcement learning)']], ex: [X('reinforcement-learning-exercises')] },
    { n: 23, part: 6, g: 24, title: 'Natural Language Processing', blurb: 'Language models, grammars, parsing and the meaning of sentences.',
      papers: [['cs6', 'Language models, n-grams and parsing']], ex: [X('nlp-communicating-exercises'), Object.assign(X('nlp-english-exercises'), { t: 'AIMA online exercises: grammar and parsing' })] },
    { n: 24, part: 6, g: 25, title: 'Deep Learning for Natural Language Processing', blurb: 'Word embeddings, recurrent networks, attention and transformers.',
      papers: [['cs6', 'Includes transformers vs recurrent networks']], ex: [Object.assign(X('nlp-english-exercises'), { t: 'Related AIMA exercises (language)' })] },
    { n: 25, part: 6, g: 27, title: 'Computer Vision', blurb: 'Image formation, filters and edges, recognition and 3-D vision.',
      papers: [['cs5', 'Convolution and pooling on an image']], ex: [X('perception-exercises')] },
    { n: 26, part: 6, g: 26, title: 'Robotics', blurb: 'Localisation, motion planning, control and robot learning.',
      papers: [['bk', 'Midterm 2 papers cover particle filtering']], ex: [X('robotics-exercises')] },
    { n: 27, part: 7, g: 28, title: 'Philosophy, Ethics, and Safety of AI', blurb: 'Limits of AI, machine minds, and the ethics of fairness, privacy and safety.',
      papers: [['bkFa25f', 'Opens with questions on ethics and equity lectures']], ex: [X('philosophy-exercises')] },
    { n: 28, part: 7, g: 29, title: 'The Future of AI', blurb: 'Components and architectures of AI systems, and where the field is heading.',
      papers: [], ex: [Object.assign(X('philosophy-exercises'), { t: 'Related AIMA exercises (philosophical foundations)' })] }
  ];
  AI.chapters.forEach(c => { c.id = 'ch-' + String(c.n).toLowerCase(); c.pc = AI.parts[c.part - 1].c; });
  AI.chapterBy = n => AI.chapters.find(c => String(c.n).toLowerCase() === String(n).toLowerCase());
  AI.allPapers = S;
})(window);
