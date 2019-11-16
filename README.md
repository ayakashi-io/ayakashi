<p align="center"><a href="https://ayakashi.io" target="_blank" rel="noopener noreferrer"><img src="https://ayakashi.io/assets/img/logo_cropped.png" alt="Ayakashi"></a></p>

<p align="center">
  <a href="https://ayakashi.io/docs/getting_started"><img src="https://img.shields.io/badge/Get-Started-brightgreen.svg" alt="Get Started"></a>
  <br/>
  <a href="https://www.npmjs.com/package/ayakashi"><img src="https://img.shields.io/npm/v/ayakashi.svg?label=version" alt="npm"></a>
  <a href="https://github.com/ayakashi-io/ayakashi/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/ayakashi.svg" alt="license"></a>
  <br/>
  <img src="https://github.com/ayakashi-io/ayakashi/workflows/Test%20Suite/badge.svg" alt="test suite">
</p>

<hr/>

<p align="center"><img width="510" height="463" src="https://ayakashi.io/assets/img/ayakashi_demo-min.gif?raw=true"/></p>

## The next generation web scraping framework

The web has changed. Gone are the days that raw html parsing scripts were the proper tool for the job.  
Javascript and single page applications are now the norm.  
Demand for data scraping and automation is higher than ever,
from business needs to data science and machine learning.  
Our tools need to evolve.

### Ayakashi helps you build scraping and automation systems that are

* easy to build
* simple or sophisticated
* highly performant
* maintainable and built for change

### Powerful querying and data models

Ayakashi's way of finding things in the page and using them is done with [props](https://ayakashi.io/docs/guide/tour.html#props)
and [domQL](https://ayakashi.io/docs/guide/querying-with-domql.html).  
Directly inspired by the relational database world (and SQL), domQL makes
DOM access easy and readable no matter how obscure the page's structure is.  
Props are the way to package domQL expressions as re-usable structures which
can then be passed around to [actions](https://ayakashi.io/docs/guide/tour.html#actions) or to be used as models for [data
extraction](https://ayakashi.io/docs/guide/data-extraction.html).    

![domql](https://ayakashi.io/assets/img/domql.png)

### High level builtin actions

Ready made actions so you can focus on what matters.  
Easily handle infinite scrolling, single page navigation, events
and [more](https://ayakashi.io/docs/reference/builtin-actions.html).  
Plus, you can always [build your own actions](https://ayakashi.io/docs/advanced/creating-your-own-actions.html),
either from scratch or by composing other actions.

### Preload code on pages

Need to include a bunch of code, a library you [made](https://ayakashi.io/docs/advanced/creating-your-own-preloaders.html)
or a [3rd party module](https://ayakashi.io/docs/going_deeper/loading-libraries-as-preloaders.html)
and make it available on a page?  
[Preloaders](https://ayakashi.io/docs/guide/tour.html#preloaders) have you covered.

### Control how you save your data

Automatically save your extracted data
to [all major SQL engines, JSON and CSV.](https://ayakashi.io/docs/guide/builtin-saving-scripts.html)  
Need something more exotic or the ability to control exactly how the data is persisted?  
Package and plug your custom logic as a script.

### Manage the flow with pipelines

Scraping the data is only one part of the deal.  
How about something like this:  

![pipelines](https://ayakashi.io/assets/img/diagram.png)

Need it to also be clean, readable and performant?  
If so, [pipelines](https://ayakashi.io/docs/guide/tour.html#pipelines) can help.

### Utilize all your cores

Ayakashi can utilize available cores as needed. Especially useful for projects that need
to run multiple operations in parallel.

### Extend it as you like

All APIs used to build the builtin functionality are properly exposed.  
All core entities are composable and extensible.

### Use the language of the web

Many argue about javascript and its quirkiness as a language but the truth is:  
If you want to scrape the web, you should speak its language.

### Great editor support

Ayakashi comes bundled with a fully documented public API that you can explore
directly in your editor.  
Autocomplete any method, check signatures and examples or follow links to more documentation.  

![editor support](https://ayakashi.io/assets/img/editor.png)

Sounds cool?  
Just head over to the [getting started guide](https://ayakashi.io/docs/getting_started)!

<hr/>

[Documentation](https://ayakashi.io/docs/getting_started)  
[Roadmap](https://github.com/ayakashi-io/ayakashi/milestones)  
[Changelog](https://changelog.ayakashi.io/)  
[Twitter](https://twitter.com/ayakashi_io)