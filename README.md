# Language-annotated Abstraction and Reasoning Corpus (LARC)

This repository contains the language annotated data with supporting assets for LARC

"How can we build intelligent systems that achieve human-level performance on challenging and structured domains (like ARC), with or without additional human guidance? The internal mental representations humans use to solve a given task are not directly observable; instead, we look to _natural language_ as a window into the cognitive representations that inform downstream behavior. We propose that the language humans use to explicitly instruct one another to solve inductive tasks can be understood as a *natural program*: much like computer programs, these instructions can be reliably interpreted and "executed" by others to produce intended outputs."

A comprehensive view of this dataset and its goals can be found in [Communicating Natural Programs to Humans and Machines](link todo)

Annotations in LARC takes the form of a communication game, where 
one participant, the *describer* solves an ARC task and describes the underlying rules using language to a different participant, 
the *builder*, who must solve the task on the new input using the description alone. 

<p align="center">
<img src="https://raw.githubusercontent.com/samacqua/LARC/main/assets/collection.jpg" alt="drawing" width="75%"/>
</p>

The entire dataset can be browsed at [the explorer interface](https://samacquaviva.com/LARC/explore)

Citation
```
@inproceedings{Larky Larc,
}
```

The original ARC data can be found here [The Abstraction and Reasoning Corpus github](https://github.com/fchollet/ARC)

## Contents
- `dataset` contains the language-annotated ARC tasks and successful natural program phrase annotations
- `explorer` contains the explorer code that allows for easy browsing of the annotated tasks
- `collection` contains the source code used to curate the dataset
- `bandit` contains the formulation and environment for bandit algorithm used for collection

