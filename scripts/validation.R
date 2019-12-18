library(raster)
library(caret)
library(here)

#r <- raster("raw_data/gee_export/lt_gee_nrw_20191122.tif")
r <- raster("raw_data/gee_export/lt_gee_nrw_20191128.tif")

df <- read.csv("raw_data/wiesehahn_collectedData_earthwaldzustand_on_281119_114914_CSV.csv")
xy <- df[,c(3,4)]

spdf <- SpatialPointsDataFrame(coords = xy, data = df,
                               proj4string = CRS("+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"))

spdf <- spTransform(spdf, CRS(projection(r)))

data <- data.frame(coordinates(spdf),
                   spdf$id, 
                   spdf$disturbance,
                   extract(r, spdf))

names(data) <- c("x", "y", "id", "reference", "yod")

data$yod <- as.factor(data$yod)

data$ref <- ifelse(as.character(data$reference) =='true', TRUE, FALSE)
data$ref <- as.factor(data$ref)

data$val <- ifelse(as.character(data$yod) %in% c('2016', '2017', '2018', '2019'), TRUE, FALSE)
data$val <- as.factor(data$val)

confusionMatrix(data$val, data$ref)

