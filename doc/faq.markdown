# Freeloader - Frequently Asked Questions

Q: Is freeloader open source?

A: Yes. It's released under the MIT license, so go nuts.


Q: Does freeloader depend on other libraries?

A: No. Freeloader aims to be a small standalone library, without dependencies on
other libraries.


Q: Does freeloader accept CSS selectors?

A: No. Freeloader only accepts IDs or classes, and won't recognize selectors
like <code>"#foo"</code> or <code>".bar"</code>


Q: Why doesn't freeloader accept CSS selectors?

A: Freeloader polls the DOM several times per second (see next question). Some
ways of querying the DOM are faster than others. One of the fastest ways is to
use <code>getElementById()</code> and <code>getElementsByClassName()</code>,
because they're natively implemented and use simple search criteria. Querying
in more complex ways, such as by using CSS selectors, is inherently slower. I
don't want to add this functionality until I can demonstrate that it performs
well in all modern browsers. Plus, I want to keep the codebase small and
standalone, adding a selector engine would more than double the codebase. When
<code>querySelectorAll()</code> gains a big enough install base, CSS selectors
may become more feasible.


Q: It queries the DOM multiple times per second? Wat?!?

A: Freeloader operates on the premises that: 1) calling
<code>getElementById()</code> a few tens of times per second will have a
negligible performance impact, 2) calling <code>getElementsByClassName()</code>
a few times at the beginning, which returns live lists, and then looping those
lists a few tens of times per second, will have a negligible performance impact.
Initial benchmarks indicate that, in modern browsers, both these premises are
true. However freeloader benchmarks itself, and throttles back the polling
frequency if it begins to absorb too much CPU time.


Q: How often does it poll the DOM?

A: A 50ms interval is imposed between polls, so if the average poll takes 1ms
to execute it ends up being about once every 51ms. The interval between polls
is increased incrementally if the polling execution time exceeds 10% of the
interval time.


Q: Does freeloader support IE6-8?

A: Yes, freeloader fulfills its contractual obligation on those browsers, but
when it gets home it curls into a fetal position in the corner and cries for a
few hours. Specifically, performance becomes a greater concern on large pages if
you use the <code>.className()</code> method, since IE6-8 don't natively
implement <code>getElementsByClassName()</code>. If freeloader doesn't detect
this method, it falls back to slower brute-force style methods.

Initial benchmarks indicate that on a very large page on IE6 (>2000 nodes),
listening for lots of different classes and IDs (>80) will cause freeloader to
throttle back to polling once every three or four seconds, spiking the processor
between 20-50% for each poll. This was on a 2.5GHZ laptop running XP Pro. For
reference, polls performed in the sub-millisecond range for both Firefox 3.6 and
Chrome 5 on the same benchmark test page on the same machine.


Q: Is freeloader ready for prime-time?

A: Short answer: it works great in modern browsers. It works, but can be slow,
in IE6 and 7.

Long answer: freeloader is a science experiment. Its purpose is to either prove
or disprove the hypothesis that <em>declarative DOM pre-processing can be done
performantly, across the most commonly-used browsers</em>. There's probably no
concise answer to this question, but I suspect that as time passes and IE9
displaces the older IEs, freeloader will be a viable option, if it isn't
already. It will probably boil down to how much you need to cater to IE 6 and 7
on large pages.

In any case I encourage people to download freeloader and help test this
hypothesis, because I think the benefits of a declarative model are worth
pursuing. That said, please petition your favorite browser vendor to support
XBL, which would obsolete freeloader if it were universally supported.


Q: How can I help?

A: Bug reports, fixes and improvements are always welcome. Also, as I've said,
this is sort of an experiment. Benchmarks on your project are welcome.
Freeloader provides tools for this:

    // returns the polling interval freeloader is currently using
    FREELOADER.benchmarks.pollingIntervalMillis();

    // returns the average execution time last 5 polls have taken
    // rounded up to nearest millisecond
    FREELOADER.benchmarks.pollingExecutionAverageMillis();

