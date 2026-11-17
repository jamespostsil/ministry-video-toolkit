# Finding video clips you're allowed to use

Short stock clips ("B-roll") can carry a moment your script talks about but has no pictures for: a globe turning
while you say "every language in the world", pages of a Bible, a plane window, a sunrise to open on. Claude can find
them for you (the `find-footage` skill): it searches the sites below, keeps only clips whose licence allows them,
looks at every one, and gives you a page of short previews to choose from.

Licences change, so **read the current terms on the site** before you rely on any of this.

**A rule of thumb for ministry videos:** if your video asks people to give, treat it as fundraising, not
"non-commercial". Every source below allows commercial use, so the question doesn't come up.

---

## Coverr

**[coverr.co](https://coverr.co/)**, under the [Coverr licence](https://coverr.co/license).

- **Free, including commercial use. No credit needed.**
- Only the free library. Clips marked **Premium** need a paid plan, and their watermarked previews may not be used.

## Mixkit

**[mixkit.co/free-stock-video](https://mixkit.co/free-stock-video/)**, under the
[Mixkit licences](https://mixkit.co/license/).

- Clips under the **Mixkit Free License** are free for commercial use, with no credit needed.
- Some clips are under the **Mixkit Restricted License**, which is for personal use only, such as your own social
  media posts. Don't use those in a ministry video. Each clip's page says which licence it has.

## Pexels

**[pexels.com/videos](https://www.pexels.com/videos/)**, under the [Pexels License](https://www.pexels.com/license/).

- Free, including commercial use. No credit needed.
- Don't suggest that the people in a clip (or a brand in it) support you, and don't show them in a bad light.
- For Claude to search it, make a free API key at [pexels.com/api](https://www.pexels.com/api/) and put it in the
  `remotion/.env` file as `PEXELS_API_KEY=...`.

## Pixabay

**[pixabay.com/videos](https://pixabay.com/videos/)**, under the
[Pixabay Content License](https://pixabay.com/service/license-summary/).

- Free, including commercial use. No credit needed (it's appreciated).
- Don't use clips with recognisable logos or brands, and don't use any clip in a misleading way.
- For Claude to search it, make a free API key at [pixabay.com/api/docs](https://pixabay.com/api/docs/) and put it
  in `remotion/.env` as `PIXABAY_API_KEY=...`.

---

## Choosing clips well

- **Things, places and hands are the safest.** A globe, a map, a Bible, hands typing or writing, a market stall, a
  sunrise. Clips with recognisable faces are allowed, but the people in them never agreed to support your ministry.
- **Never let a stock clip stand in for real people.** Don't show stock people while you talk about a real
  language community, a translator or a partner by name. Use your own photos there.
- **No brands or organisations:** logos on laptops and planes, a mission agency, NASA, a mapping app.
- **Think about how your supporters will read it:** another faith's rituals, worship from a different tradition,
  and political symbols can distract from what you're saying.
- **Keep the record.** When Claude downloads a clip, it notes where it came from and its licence in
  `clip-licenses.csv`. Keep that file with your video. If a site or YouTube ever asks, it shows you may use the clip.
