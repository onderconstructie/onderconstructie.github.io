suppressMessages({ library(survey) })
options(survey.lonely.psu = "adjust")
args <- commandArgs(TRUE); dir <- args[1]
pop <- read.csv(file.path(dir, "populatie.csv"), colClasses = c(regio="character", leeftijd="character", lg="character", geslacht="character"))
ontw <- jsonlite_free <- NULL
namen <- sub("\\.csv$", "", setdiff(list.files(dir, "^D[0-9a-z]+\\.csv$"), character(0)))
lees_json <- function(f) { x <- readLines(f, warn = FALSE); paste(x, collapse = "") }
info <- lees_json(file.path(dir, "ontwerpen.json"))
heeft <- function(naam, veld) grepl(paste0('"', naam, '":\\{[^}]*"', veld, '":true'), info)
uit <- c()
for (naam in namen) {
  s <- read.csv(file.path(dir, paste0(naam, ".csv")), colClasses = c(vLaag="character", vPsu="character", vSsu="character", vN1="character", vN2="character", status="character", regio="character", leeftijd="character", lg="character"), na.strings = "NIETS")
  s$vN1 <- ifelse(s$vN1 == "Inf", Inf, as.numeric(s$vN1))
  if (heeft(naam, "nr")) {
    # eigen klassecorrectie, onafhankelijk van de kern
    tot <- tapply(s$w, s$leeftijd, sum); resp <- tapply(s$w * (s$status == "ja"), s$leeftijd, sum)
    s$w <- s$w * (tot / resp)[s$leeftijd]
    s <- s[s$status == "ja", ]
  }
  twee <- any(s$vSsu != "")
  if (twee) {
    s$vN2 <- as.numeric(s$vN2)
    d <- svydesign(ids = ~vPsu + vSsu, strata = ~vLaag, fpc = ~vN1 + vN2, weights = ~w, data = s, nest = TRUE)
  } else if (all(is.infinite(s$vN1))) {
    d <- svydesign(ids = ~vPsu, strata = ~vLaag, weights = ~w, data = s, nest = TRUE)
  } else {
    s$vN1b <- ifelse(is.infinite(s$vN1), 1e15, s$vN1)
    d <- svydesign(ids = ~vPsu, strata = ~vLaag, fpc = ~vN1b, weights = ~w, data = s, nest = TRUE)
  }
  if (heeft(naam, "rake")) {
    s$regio <- factor(s$regio); s$lg <- factor(s$lg)
    d <- update(d, regio = factor(regio), lg = factor(lg))
    mm <- model.matrix(~regio + lg, transform(pop, regio = factor(regio, levels = levels(d$variables$regio)), lg = factor(lg, levels = levels(d$variables$lg))))
    d <- calibrate(d, ~regio + lg, population = colSums(mm), calfun = "raking", maxit = 200, epsilon = 1e-12)
  }
  if (heeft(naam, "post")) {
    pt <- as.data.frame(table(leeftijd = pop$leeftijd))
    d <- postStratify(d, ~leeftijd, pt)
  }
  # vrijheidsgraden zonder groepen die uit een zekere cluster bestaan (bewuste keuze van de kern)
  v <- d$variables; nz <- v$zeker == 0
  mydf <- if (any(v$zeker == 1) && sum(nz) > 0) length(unique(paste(v$vLaag, v$vPsu)[nz])) - length(unique(v$vLaag[nz])) else degf(d)
  dt <- if (all(is.infinite(v$vN1))) "replace" else TRUE
  m1 <- svymean(~sport, d, deff = dt); ci1 <- svyciprop(~sport, d, method = "xlogit", df = mydf)
  ci1b <- svyciprop(~sport, d, method = "logit", df = mydf)
  m2 <- svymean(~vrijwilliger, d, deff = dt); c2 <- confint(m2, df = mydf)
  m3 <- svytotal(~vrijwilliger, d, deff = dt)
  by <- svyby(~vrijwilliger, ~regio, d, svymean)
  rij <- c(naam = naam, n = nrow(d$variables), df = mydf, dfR = degf(d), wsum = sum(weights(d)),
    sport = coef(m1), sport_se = SE(m1), sport_deff = deff(m1), sport_lo = attr(ci1, "ci")[1], sport_hi = attr(ci1, "ci")[2],
    sport_lo_glm = attr(ci1b, "ci")[1], sport_hi_glm = attr(ci1b, "ci")[2],
    vrijw = coef(m2), vrijw_se = SE(m2), vrijw_deff = deff(m2), vrijw_lo = c2[1], vrijw_hi = c2[2],
    vtot = coef(m3), vtot_se = SE(m3), vtot_deff = deff(m3))
  for (r in rownames(by)) { rij[paste0("regio_", r)] <- by[r, "vrijwilliger"]; rij[paste0("regio_", r, "_se")] <- by[r, "se"] }
  write.csv(data.frame(w = weights(d)), file.path(dir, paste0(naam, ".Rw.csv")), row.names = FALSE)
  uit <- c(uit, paste(names(rij), format(rij, digits = 17), sep = "=", collapse = ";"))
}
writeLines(uit, file.path(dir, "R.txt"))
cat("klaar", length(uit), "\n")
