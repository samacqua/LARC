import json
import pandas as pd
import nltk
import matplotlib.pyplot as plt
import pickle
import numpy as np


def load_tasks(task_nums):
    dataset = {}
    for task in task_nums:
        with open(f'dataset/{task}.json') as f:
            dataset[task] = json.load(f)
    return dataset


def create_pandas_df(tasks):
    descs_df = pd.DataFrame()
    builds_df = pd.DataFrame()

    for task_num, task_obj in tasks.items():
        task_descs = task_obj['descriptions']
        task_descs_df = pd.DataFrame(task_descs).T
        task_descs_df['task'] = task_num
        task_descs_df['successful_communication'] = False

        for desc_id, desc_obj in task_descs.items():
            desc_builds_df = pd.DataFrame(desc_obj['builds']).T
            if len(desc_builds_df.index) > 0:
                desc_builds_df['desc_id'] = desc_id
                desc_builds_df['task'] = task_num
                builds_df = builds_df.append(desc_builds_df)

                # mark if desc has a success
                if len(desc_builds_df[
                           (desc_builds_df['desc_id'] == desc_id) & (desc_builds_df['success'] == True)].index) > 0:
                    task_descs_df.at[desc_id, 'successful_communication'] = True

        descs_df = descs_df.append(task_descs_df)

    # only store ID of builds
    descs_df.builds = descs_df.builds.apply(lambda x: list(x))

    task_nums = list(tasks.keys())
    local_file = f'dataframes_{sum(task_nums)}.data'

    fw = open(local_file, 'wb')
    pickle.dump((descs_df, builds_df), fw)
    fw.close()

    return descs_df, builds_df


def tokenize_descriptions(descs_df, seperator='||', n=1):
    padded_seperator = f' {seperator} '
    see_prefix = 'in the input, you should see...'
    desc_see = descs_df.see_description.apply(lambda s: s[len(see_prefix):]).str.lower().str.cat(sep=padded_seperator)
    see_words = get_ngrams(nltk.tokenize.word_tokenize(desc_see), n, separator=seperator)

    grid_prefix = 'the output grid size...'
    desc_grid = descs_df.grid_description.apply(lambda s: s[len(grid_prefix):]).str.lower().str.cat(
        sep=padded_seperator)
    grid_words = get_ngrams(nltk.tokenize.word_tokenize(desc_grid), n, separator=seperator)

    do_prefix = 'to make the output, you have to...'
    desc_do = descs_df.do_description.apply(lambda s: s[len(do_prefix):]).str.lower().str.cat(sep=padded_seperator)
    do_words = get_ngrams(nltk.tokenize.word_tokenize(desc_do), n, separator=seperator)

    return see_words, grid_words, do_words


def get_ngrams(unigrams, n, separator='||'):
    if separator:
        ngrams = nltk.ngrams(unigrams, n)
        return [gram for gram in ngrams if not separator in gram]
    return nltk.ngrams(unigrams, n)


def get_freq_dist(ngrams):
    seperator = '||'
    extra_stopwords = ['.', ',', seperator]
    stopwords = nltk.corpus.stopwords.words('english') + extra_stopwords
    return nltk.FreqDist(' '.join(w) for w in ngrams if not any(stop in w for stop in stopwords))


def ngrams_counts(descs_df, n=2):
    see_words, grid_words, do_words = tokenize_descriptions(descs_df, n=n)
    tot_words = see_words + grid_words + do_words

    see_words_freq_dist = get_freq_dist(see_words)
    grid_words_freq_dist = get_freq_dist(grid_words)
    do_words_freq_dist = get_freq_dist(do_words)
    tot_freq_dist = get_freq_dist(tot_words)

    plt.ylabel("Frequency")
    plt.xlabel("Word")

    plt.gcf().subplots_adjust(bottom=0.2)
    plt.title("\"You should see...\" description word frequency")
    see_words_freq_dist.plot(30, cumulative=False)

    plt.gcf().subplots_adjust(bottom=0.2)
    plt.title("Grid Size description word frequency")
    grid_words_freq_dist.plot(30, cumulative=False)

    plt.gcf().subplots_adjust(bottom=0.2)
    plt.title("\"You have to...\" description word frequency")
    do_words_freq_dist.plot(30, cumulative=False)

    plt.gcf().subplots_adjust(bottom=0.2)
    plt.title("Total word frequency")
    tot_freq_dist.plot(30, cumulative=False)


def get_num_colors(grid):
    colors = set()
    for row in grid:
        for color in row:
            colors.add(color)
    return colors


def compare_grids(descs_df):
    by_task = descs_df.groupby('task').successful_communication.any()

    successful_tasks = set([task for task, successful in by_task.to_dict().items() if successful])
    suc_sizes = []
    suc_num_colors = []
    for task in successful_tasks:
        test_grid = tasks[task]['test'][0]['input']
        suc_sizes.append(len(test_grid) * len(test_grid[0]))
        suc_num_colors.append(len(get_num_colors(test_grid)))

    unsuccessful_tasks = set(task_nums) - successful_tasks
    unsuc_sizes = []
    unsuc_num_colors = []
    for task in unsuccessful_tasks:
        test_grid = tasks[task]['test'][0]['input']
        unsuc_sizes.append(len(test_grid) * len(test_grid[0]))
        unsuc_num_colors.append(len(get_num_colors(test_grid)))

    print("Successful tasks test input size mean:", np.mean(suc_sizes))
    print("Unsuccessful tasks test input size mean:", np.mean(unsuc_sizes))

    plt.title('Test input grid sizes')
    bins = np.linspace(min(min(unsuc_sizes), min(suc_sizes)), max(max(unsuc_sizes), max(suc_sizes)), num=30)
    plt.hist(suc_sizes, bins=bins, alpha=0.5, label="Successful")
    plt.hist(unsuc_sizes, bins=bins, alpha=0.5, label="Unsuccessful")
    plt.legend(loc='upper right')
    plt.show()

    print("Successful tasks number colors mean:", np.mean(suc_num_colors))
    print("Unsuccessful tasks number colors mean:", np.mean(unsuc_num_colors))

    plt.title('Test input grid colors')
    bins = list(range(1, 11))
    plt.hist(suc_num_colors, bins=bins, alpha=0.5, label="Successful")
    plt.hist(unsuc_num_colors, bins=bins, alpha=0.5, label="Unsuccessful")
    plt.legend(loc='upper right')
    plt.show()


def ngram_dif(descs_df, n=2):
    # compare n-grams in successful tasks vs unsuccessful tasks
    successful_descs, unsuccessful_descs = descs_df[descs_df.successful_communication == True], \
                                           descs_df[descs_df.successful_communication == False]

    see_words_suc, grid_words_suc, do_words_suc = tokenize_descriptions(successful_descs, n=n)
    see_words_unsuc, grid_words_unsuc, do_words_unsuc = tokenize_descriptions(unsuccessful_descs, n=n)
    see_words, grid_words, do_words = see_words_suc + see_words_unsuc, grid_words_suc + grid_words_unsuc, \
                                      do_words_suc + do_words_unsuc

    suc_words = see_words_suc + grid_words_suc + do_words_suc
    unsuc_words = see_words_unsuc + grid_words_unsuc + do_words_unsuc
    words = see_words + grid_words + do_words

    perc_difs = {}
    seperator = '||'
    extra_stopwords = ['.', ',', seperator, '...']
    stopwords = nltk.corpus.stopwords.words('english') + extra_stopwords

    for ngram in set(w for w in do_words_suc if not any(stop in w for stop in stopwords)):

        # '(' and ')' have special meanings in pandas regex, so have to put \ in front
        ngram = tuple([f'\\{word}' if word in ['(', ')'] else word for word in list(ngram)])
        ngram_regex = '.{1,3}'.join(ngram)

        suc_descs_w_word = successful_descs[successful_descs['do_description'].str.contains(ngram_regex, regex=True)]
        perc_suc_descs = len(suc_descs_w_word.index) / len(successful_descs)

        unsuc_descs_w_word = unsuccessful_descs[unsuccessful_descs['do_description'].str.contains(ngram_regex, regex=True)]
        perc_unsuc_descs = len(unsuc_descs_w_word.index) / len(unsuccessful_descs)

        ngram = tuple([word[1] if word in ['\(', '\)'] else word for word in list(ngram)])
        perc_difs[ngram] = (perc_suc_descs, perc_unsuc_descs)

    perc_difs = [(k, v) for k, v in perc_difs.items()]
    perc_difs = sorted(perc_difs, key=lambda x: x[1][0] - x[1][1])
    print("Worst n-grams:", perc_difs[:5])
    print("Best n-grams:", perc_difs[-5:])


if __name__ == '__main__':
    task_nums = range(400)

    # sus way to save filename to account for which tasks are being saved
    # saving name of each task is too long to save
    local_file = f'dataframes_{sum(task_nums)}.data'
    tasks = load_tasks(task_nums)

    try:
        fd = open(local_file, 'rb')
        descs_df, builds_df = pickle.load(fd)
        fd.close()
    except FileNotFoundError:
        print("Not computed yet, creating and saving locally...")
        descs_df, builds_df = create_pandas_df(tasks)

    compare_grids(descs_df)

    n = 2
    ngram_dif(descs_df, n=n)
    ngrams_counts(descs_df, n=n)
