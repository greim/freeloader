# Freeloader - Frequently Asked Questions

## Q: Is freeloader open source?

A: Yes. It's released under the MIT license, so go nuts.

## Q: Does freeloader depend on other libraries?

A: No. Freeloader aims to be a small standalone library, without dependencies on
other libraries.

## Q: Does freeloader accept CSS selectors?

A: No. For various reasons, freeloader only accepts IDs or classes, and won't
recognize selectors like <code>"#foo"</code> or <code>".bar"</code>

## Q: Wait, why doesn't freeloader accept CSS selectors?

A: Freeloader polls the DOM several times per second (see next question). Some
ways of querying the DOM are faster than others. One of the fastest ways is to
use <code>getElementById()</code> and <code>getElementsByClassName()</code>,
because they're natively implemented and use simple search criteria. Querying
in more complex ways, such as by using CSS selectors, is inherently slower. I
don't want to add this functionality until I can demonstrate that it performs
well in all modern browsers. Plus, I want to keep the freeloader small and
standalone. Adding a selector engine would more than double the codebase. When
<code>querySelectorAll()</code> gains a big enough install base, CSS selectors
may become more feasible.

## Q: Is calling getElementsByClassName() several times per second going to slow things down, despite being a native function?

Possibly, however freeloader doesn't actually call it multiple times per second.
It only calls it once for each className you declare, storing the returned list
in memory. Since the list is live (reflects the real-time state of the document)
freeloader merely loops the list periodically to see what's been added.

## Q: How often does it poll the DOM?

A: A 50ms interval is imposed between polls, so if the average poll takes 1ms
to execute it ends up being about once every 51ms. The polling frequency is
throttled back if the polling execution time exceeds 10% of the interval time.

Also, class and id polls occur on an alternating basis, so it checks for
classes, waits 50ms, checks for ids, waits 50ms, etc.

## Q: Does freeloader support older browsers?

A: Freeloader fulfills its contractual obligation (passes all tests) on browsers
as far back as IE6 and Mozilla 1.7 (mind you, that's *Mozilla*, not Firefox).
However when it gets home it curls into a fetal position in the corner and cries
for a few hours. Specifically, performance becomes a greater concern on huge
pages if you use the <code>.className()</code> method, since
<code>getElementsByClassName()</code> is a relative newcomer to the game. If
freeloader doesn't detect this method, it falls back to
<code>querySelectorAll()</code>, and failing that, to brute-force methods.

Initial benchmarks indicate that on a very large page (>2000 nodes) on IE6,
listening for lots of different classes and IDs (>80) will cause freeloader to
throttle back to polling once every three or four seconds, spiking the processor
between 20-50% for each query. This was on a 2.5GHZ laptop running XP Pro. YMMV.

For comparison, those same queries performed in the sub-millisecond range for
both Firefox 3.6 and Chrome 5 on the same benchmark test page on the same
machine.

## Q: Performance-wise, is freeloader ready for prime-time?

A: <del>Short</del> Medium answer: Freeloader floats along with almost no
detectable footprint in modern browsers. It works, but can be slow, on really
big pages in old browsers. Of particular interest are IE6 and 7, since these
browsers are both antiquated and common. If you have big pages (I mean *really*
big) and you need things to snap, crackle and pop on IE6 and 7, (or decrepit
versions of Gecko, Webkit or Presto) then freeloader isn't for you.

Long answer: freeloader is a science experiment. Its purpose is to either prove
or disprove the hypothesis that <em>declarative DOM pre-processing can be done
performantly, across the most commonly-used browsers</em>. I suspect that as
time passes and IE9 displaces the older IEs, freeloader will be an increasingly
viable option, if it isn't already.
