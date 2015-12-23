# BuyCo
BuyCo.io Proof of Concept


## Installation
The BuyCo Install is very similar as described in the [MoneyCircles README.md](https://github.com/OutlierVentures/MoneyCirclesBitReserve/tree/development)

#### Local installation
To get a version working you can mess around with on the local machine, you can clone the (this) repo.

#### The GIT bit
Developers typically have read-only access to the OutlierVentures company github account. You can't clone or branch in the Outlier Ventures ('you're already looking at it).
So you'll have to have at least a GitHub Micro subscription, to clone the repo to your own private repo, as ofcourse we DON't want the repo set public.

Code submission is then done using pull requests.

Check out your own fork from your own `Code` or `dev` folder, or whatever

    git clone https://github.com/bartvanderwal/BuyCo.git

Go into the just cloned folder, and add the original repo as a remote named `upstream`.

    cd BuyCo/
    git remote -v // Before there's only `origin
    git remote add upstream https://github.com/OutlierVentures/BuyCo.git
    git remote -v // After there's both your own `origin` and the new `upstream` (a `fetch` and `push` for both, so 4 in total) 

When you want to resync your local folder with the main one do: (you might need to do merging, stashing beforehand etc.)

    git fetch origin

You'll want to have both a local copy of the `master` branch as the `development` branch so you can use [git-flow](http://nvie.com/posts/a-successful-git-branching-model/) also locally:

    git checkout -b development origin/development

Typically you'll ONLY work on your `development` branch. Possibly you'll use separate feature branches, even put them on your own remote for backup, but you'll never do a pull-request from them, only from the `development` branch.
