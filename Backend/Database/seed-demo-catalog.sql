-- Optional illustrative catalog. Sensor thresholds require calibration per plant/device.
-- No accounts, credentials, measurements or fake watering history are inserted.
IF NOT EXISTS(SELECT 1 FROM dbo.PlantCatalog WHERE CommonName=N'Tomato')
 INSERT dbo.PlantCatalog(CommonName,ScientificName,Category,Description,WateringAdvice,CareInstructions)
 VALUES(N'Tomato',N'Solanum lycopersicum',N'Vegetable',N'Example catalog entry.',N'Check soil before watering; calibrate sensors.',N'Adjust care to variety, pot, drainage and environment.');
IF NOT EXISTS(SELECT 1 FROM dbo.PlantCatalog WHERE CommonName=N'Basil')
 INSERT dbo.PlantCatalog(CommonName,ScientificName,Category,Description,WateringAdvice,CareInstructions)
 VALUES(N'Basil',N'Ocimum basilicum',N'Herb',N'Example catalog entry.',N'Check soil before watering; avoid waterlogging.',N'Adjust care to local conditions.');
