#include <cassert>
#include "SenzorLumina.h"
#include "SenzorUmiditateSol.h"
int test_sample = 0;
unsigned long test_ms = 0;
int main(){
 SenzorLumina light(34);light.begin();
 test_sample = 0;assert(light.CitesteLux()==0);
 test_sample = 2048;assert(light.CitesteLux()>40 && light.CitesteLux()<60);
 test_sample = 4095;assert(light.CitesteLux()==100);
 SenzorUmiditateSol soil(33);soil.begin();
 test_sample = 1100;assert(soil.CitireUmiditateSol()==100);
 test_sample = 3100;assert(soil.CitireUmiditateSol()==0);
 test_sample = 2200;assert(soil.CitireUmiditateSol()>40 && soil.CitireUmiditateSol()<60);
}
