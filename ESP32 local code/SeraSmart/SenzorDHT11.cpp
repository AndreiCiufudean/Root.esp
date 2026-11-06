#include "SenzorDHT11.h"

SenzorDHT11::SenzorDHT11(int p, int tip):pin(p), dht(p, tip){}

void SenzorDHT11::begin()
{
  dht.begin();
}

int SenzorDHT11::CitireTemperatura()
{
  return (int)dht.readTemperature();
}

int SenzorDHT11::CitireUmiditate()
{
  return (int)dht.readHumidity();
}