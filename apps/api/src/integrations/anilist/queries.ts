export const MEDIA_PAGE_FIELDS = `
  id
  title { romaji english native }
  coverImage { extraLarge large }
  bannerImage
  startDate { year month day }
  endDate { year month day }
  season seasonYear
  format status episodes duration
  averageScore popularity trending
  source countryOfOrigin
  genres
  studios(isMain: true) { nodes { id name } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
`

export const MEDIA_PAGE_QUERY = `
query MediaPage(
  $page: Int, $perPage: Int, $search: String, $genre: String,
  $season: MediaSeason, $seasonYear: Int, $format: MediaFormat,
  $status: MediaStatus, $minScore: Int, $sort: [MediaSort]
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total perPage currentPage lastPage hasNextPage }
    media(
      search: $search, genre: $genre, season: $season,
      seasonYear: $seasonYear, format: $format, status: $status,
      averageScore_greater: $minScore, sort: $sort, type: ANIME,
      isAdult: false, genre_not_in: ["Hentai"]
    ) {
      ${MEDIA_PAGE_FIELDS}
    }
  }
}`

export const MEDIA_BASIC_DETAIL_QUERY = `
query MediaBasicDetail($id: Int) {
  Media(id: $id, type: ANIME, isAdult: false) {
    id siteUrl
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    startDate { year month day }
    endDate { year month day }
    season seasonYear
    format status episodes duration
    averageScore popularity trending
    source countryOfOrigin
    genres
    studios(isMain: true) { nodes { id name } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
  }
}`

export const MEDIA_DETAIL_QUERY = `
query MediaDetail($id: Int, $charPage: Int, $charPerPage: Int, $staffPerPage: Int, $recPage: Int, $recPerPage: Int) {
  Media(id: $id, type: ANIME, isAdult: false) {
    id siteUrl
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large }
    bannerImage
    startDate { year month day }
    endDate { year month day }
    season seasonYear
    format status episodes duration
    averageScore popularity trending
    source countryOfOrigin
    genres
    studios(isMain: true) { nodes { id name } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    characters(page: $charPage, perPage: $charPerPage, sort: ROLE) {
      pageInfo { total perPage currentPage lastPage hasNextPage }
      edges {
        role
        node { id name { full native } image { large } }
        voiceActors(language: JAPANESE, sort: RELEVANCE) { id name { full native } image { large } }
      }
    }
    staff(page: 1, perPage: $staffPerPage) {
      pageInfo { total }
      edges {
        role
        node { id name { full native } image { large } }
      }
    }
    relations {
      edges {
        relationType
        node { id title { romaji english native } format status episodes averageScore coverImage { large } }
      }
    }
    recommendations(page: $recPage, perPage: $recPerPage, sort: RATING_DESC) {
      pageInfo { total }
      nodes {
        rating
        mediaRecommendation {
          id title { romaji english native } format status episodes averageScore coverImage { large }
        }
      }
    }
  }
}`
