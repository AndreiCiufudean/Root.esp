#include "SenzorDHT11.h"

SenzorDHT11::SenzorDHT11(int p, int tip):pin(p), dht(p, tip){}

void SenzorDHT11::begin()
{
  dht.begin();
}

double SenzorDHT11::CitireTemperatura()
{
  return dht.readTemperature();
}

double SenzorDHT11::CitireUmiditate()
{
  return dht.readHumidity();
}